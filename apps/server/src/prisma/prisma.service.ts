import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { APP_CONFIG } from "../config/config.module.js";
import { Inject } from "@nestjs/common";

interface SqliteColumn {
  name: string;
  /** SQLite integer columns surface as BigInt through Prisma raw queries. */
  notnull: number | bigint;
}

/**
 * Wraps PrismaClient with lifecycle hooks. Resolves the database URL from
 * resolved config so the app works with zero env config (SQLite default).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(APP_CONFIG) private readonly cfg: { databaseUrl: string }) {
    super({
      datasources: { db: { url: cfg.databaseUrl } },
      log: ["warn", "error"],
    });
  }

  async onModuleInit() {
    await this.$connect();
    await this.migrateLegacySchema();
    this.logger.log(`Connected to database (${this.mask(this.cfg.databaseUrl)})`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Idempotent runtime migration for databases created before unfiled
   * bookmarks existed. Runs on every boot (raw SQL only, so it never depends
   * on the generated Prisma client knowing retired columns) and does nothing
   * once the on-disk schema is current:
   *
   *  1. Older schemas declared `Bookmark.folderId` as NOT NULL. SQLite cannot
   *     relax that in place, so the table is rebuilt (same columns + FKs,
   *     nullable folderId) inside one transaction, preserving all rows.
   *  2. Legacy "All Bookmarks" default folders are folded away: their
   *     bookmarks become unfiled (folderId = NULL — never deleted), their
   *     unlock tokens are removed, the folders are deleted, and the retired
   *     `Folder.isDefault` remains only as an idempotent migration marker.
   *
   * Keeping the retired marker makes migration safe whether schema sync or
   * server startup happens first. Fresh databases never create a default row.
   */
  private async migrateLegacySchema(): Promise<void> {
    if (!this.cfg.databaseUrl.startsWith("file:")) return; // SQLite only

    try {
      const tables = new Set(
        (
          await this.$queryRaw<Array<{ name: string }>>(
            Prisma.sql`SELECT name FROM sqlite_master WHERE type = 'table'`,
          )
        ).map((t) => t.name),
      );
      if (!tables.has("Bookmark") || !tables.has("Folder")) return; // fresh database

      // --- 1. make Bookmark.folderId nullable (table rebuild) ---
      const bookmarkColumns = await this.$queryRaw<SqliteColumn[]>(
        Prisma.sql`PRAGMA table_info("Bookmark")`,
      );
      const folderIdColumn = bookmarkColumns.find((c) => c.name === "folderId");
      if (folderIdColumn && Number(folderIdColumn.notnull) === 1) {
        await this.rebuildBookmarkTableWithNullableFolderId(bookmarkColumns);
        this.logger.log("Made Bookmark.folderId nullable (unfiled bookmarks are now supported)");
      }

      // --- 2. fold legacy default folders into unfiled bookmarks ---
      const folderColumns = await this.$queryRaw<SqliteColumn[]>(
        Prisma.sql`PRAGMA table_info("Folder")`,
      );
      if (!folderColumns.some((c) => c.name === "isDefault")) return; // already migrated
      const [legacyDefaults] = await this.$queryRaw<Array<{ count: number | bigint }>>(
        Prisma.sql`SELECT COUNT(*) AS count FROM "Folder" WHERE "isDefault" = 1`,
      );
      if (!legacyDefaults || Number(legacyDefaults.count) === 0) return;

      const hasFolderTokens = tables.has("FolderToken");
      await this.$transaction(
        async (tx) => {
          // Move bookmarks out of default folders first — bookmarks are never lost.
          await tx.$executeRawUnsafe(
            `UPDATE "Bookmark" SET "folderId" = NULL
             WHERE "folderId" IN (SELECT "id" FROM "Folder" WHERE "isDefault" = 1)`,
          );
          if (hasFolderTokens) {
            await tx.$executeRawUnsafe(
              `DELETE FROM "FolderToken"
               WHERE "folderId" IN (SELECT "id" FROM "Folder" WHERE "isDefault" = 1)`,
            );
          }
          await tx.$executeRawUnsafe(`DELETE FROM "Folder" WHERE "isDefault" = 1`);
        },
        // copying rows + folding folders may take a while on large databases
        { timeout: 120_000, maxWait: 10_000 },
      );
      this.logger.log("Migrated legacy default folders to unfiled bookmarks");
    } catch (err) {
      this.logger.error(`Legacy schema migration failed: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * SQLite cannot alter a NOT NULL constraint in place, so Bookmark is
   * recreated with an identical shape except `folderId TEXT` (nullable).
   * Runs in a single transaction; every existing row is copied.
   */
  private async rebuildBookmarkTableWithNullableFolderId(columns: SqliteColumn[]): Promise<void> {
    const copyList = columns
      .filter((c) => BOOKMARK_TABLE_COLUMNS.includes(c.name))
      .map((c) => `"${c.name}"`)
      .join(", ");

    await this.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(`DROP TABLE IF EXISTS "Bookmark_migration"`);
        await tx.$executeRawUnsafe(BOOKMARK_MIGRATION_DDL);
        await tx.$executeRawUnsafe(
          `INSERT INTO "Bookmark_migration" (${copyList}) SELECT ${copyList} FROM "Bookmark"`,
        );
        await tx.$executeRawUnsafe(`DROP TABLE "Bookmark"`);
        await tx.$executeRawUnsafe(`ALTER TABLE "Bookmark_migration" RENAME TO "Bookmark"`);
        await tx.$executeRawUnsafe(`CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId")`);
        await tx.$executeRawUnsafe(`CREATE INDEX "Bookmark_folderId_idx" ON "Bookmark"("folderId")`);
        await tx.$executeRawUnsafe(`CREATE INDEX "Bookmark_createdAt_idx" ON "Bookmark"("createdAt")`);
      },
      // the row copy must not be cut off by the default 5s transaction timeout
      { timeout: 120_000, maxWait: 10_000 },
    );
  }

  private mask(url: string): string {
    return url.startsWith("file:") ? `file:${url.slice(5).split("/").pop()}` : "postgres";
  }
}

/** Column names shared by the old and new Bookmark tables (schema.prisma). */
const BOOKMARK_TABLE_COLUMNS: readonly string[] = [
  "id",
  "userId",
  "folderId",
  "url",
  "title",
  "description",
  "domain",
  "contentHtml",
  "contentMarkdown",
  "contentText",
  "fetchStatus",
  "isRead",
  "createdAt",
  "updatedAt",
];

/** Identical to the previous generated DDL except folderId is now nullable. */
const BOOKMARK_MIGRATION_DDL = `
CREATE TABLE "Bookmark_migration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "folderId" TEXT,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT NOT NULL,
    "contentHtml" TEXT,
    "contentMarkdown" TEXT,
    "contentText" TEXT,
    "fetchStatus" TEXT NOT NULL DEFAULT 'ok',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bookmark_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`;
