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
   * Idempotent runtime migration for databases created against older schemas.
   * Raw SQL only, so it never depends on the generated client knowing retired
   * columns. Fresh databases (no Bookmark/Folder tables) are left untouched.
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
      if (!tables.has("Bookmark") || !tables.has("Folder") || !tables.has("User")) return;

      // --- 1. make Bookmark.folderId nullable (table rebuild) ---
      const bookmarkColumns = await this.$queryRaw<SqliteColumn[]>(
        Prisma.sql`PRAGMA table_info("Bookmark")`,
      );
      const folderIdColumn = bookmarkColumns.find((c) => c.name === "folderId");
      if (folderIdColumn && Number(folderIdColumn.notnull) === 1) {
        await this.rebuildBookmarkTableWithNullableFolderId(bookmarkColumns);
        this.logger.log("Made Bookmark.folderId nullable (unfiled bookmarks are now supported)");
      }

      // --- 2. add missing reader-rework columns (purely additive) ---
      await this.addMissingColumns(
        "Bookmark",
        BOOKMARK_ADDITIVE_COLUMNS,
        await this.$queryRaw<SqliteColumn[]>(Prisma.sql`PRAGMA table_info("Bookmark")`),
      );

      // --- 3. username → displayName (drop uniqueness; keep values) ---
      await this.migrateUsernameToDisplayName(
        await this.$queryRaw<SqliteColumn[]>(Prisma.sql`PRAGMA table_info("User")`),
      );

      await this.addMissingColumns(
        "User",
        USER_ADDITIVE_COLUMNS,
        await this.$queryRaw<SqliteColumn[]>(Prisma.sql`PRAGMA table_info("User")`),
      );

      if (tables.has("EmailVerificationToken") || (await this.tableExists("EmailVerificationToken"))) {
        await this.addMissingColumns(
          "EmailVerificationToken",
          EMAIL_TOKEN_ADDITIVE_COLUMNS,
          await this.$queryRaw<SqliteColumn[]>(
            Prisma.sql`PRAGMA table_info("EmailVerificationToken")`,
          ),
        );
        await this.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_purpose_idx"
           ON "EmailVerificationToken"("userId", "purpose")`,
        );
      }

      await this.ensureMfaTables();

      // --- 4. fold legacy default folders into unfiled bookmarks ---
      const folderColumns = await this.$queryRaw<SqliteColumn[]>(
        Prisma.sql`PRAGMA table_info("Folder")`,
      );
      if (folderColumns.some((c) => c.name === "isDefault")) {
        const [legacyDefaults] = await this.$queryRaw<Array<{ count: number | bigint }>>(
          Prisma.sql`SELECT COUNT(*) AS count FROM "Folder" WHERE "isDefault" = 1`,
        );
        if (legacyDefaults && Number(legacyDefaults.count) > 0) {
          const hasFolderTokens = await this.tableExists("FolderToken");
          await this.$transaction(
            async (tx) => {
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
            { timeout: 120_000, maxWait: 10_000 },
          );
          this.logger.log("Migrated legacy default folders to unfiled bookmarks");
        }
      }
    } catch (err) {
      this.logger.error(`Legacy schema migration failed: ${(err as Error).message}`);
      throw err;
    }
  }

  private async tableExists(name: string): Promise<boolean> {
    const rows = await this.$queryRaw<Array<{ name: string }>>(
      Prisma.sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${name}`,
    );
    return rows.length > 0;
  }

  /**
   * SQLite cannot drop a UNIQUE constraint in place. Rebuild User, copying
   * `username` into `displayName` and omitting the unique index.
   */
  private async migrateUsernameToDisplayName(columns: SqliteColumn[]): Promise<void> {
    const names = new Set(columns.map((c) => c.name));
    if (!names.has("username")) return; // already on displayName
    if (names.has("displayName")) {
      await this.$executeRawUnsafe(
        `UPDATE "User" SET "displayName" = "username" WHERE "displayName" IS NULL OR "displayName" = ''`,
      );
    }

    await this.$executeRawUnsafe(`PRAGMA foreign_keys = OFF`);
    try {
      const select = (name: string, fallback = "NULL"): string =>
        names.has(name) ? `"${name}"` : fallback;
      const displayNameExpr = names.has("displayName")
        ? `COALESCE(NULLIF("displayName", ''), "username")`
        : `"username"`;

      await this.$transaction(
        async (tx) => {
          await tx.$executeRawUnsafe(`DROP TABLE IF EXISTS "User_migration"`);
          await tx.$executeRawUnsafe(USER_MIGRATION_DDL);
          await tx.$executeRawUnsafe(
            `INSERT INTO "User_migration" (
              "id", "displayName", "email", "passwordHash", "emailVerifiedAt", "pendingEmail",
              "preferences", "totpSecretEnc", "totpEnabledAt", "avatarMime", "avatarUpdatedAt",
              "avatarBytes", "createdAt", "updatedAt"
            )
            SELECT
              "id", ${displayNameExpr}, "email", "passwordHash",
              ${select("emailVerifiedAt")}, ${select("pendingEmail")},
              ${select("preferences")}, ${select("totpSecretEnc")}, ${select("totpEnabledAt")},
              ${select("avatarMime")}, ${select("avatarUpdatedAt")}, ${select("avatarBytes")},
              "createdAt", "updatedAt"
            FROM "User"`,
          );
          await tx.$executeRawUnsafe(`DROP TABLE "User"`);
          await tx.$executeRawUnsafe(`ALTER TABLE "User_migration" RENAME TO "User"`);
        },
        { timeout: 120_000, maxWait: 10_000 },
      );
      this.logger.log("Migrated User.username to non-unique displayName");
    } finally {
      await this.$executeRawUnsafe(`PRAGMA foreign_keys = ON`);
    }
  }

  private async ensureMfaTables(): Promise<void> {
    await this.$executeRawUnsafe(MFA_BACKUP_CODE_DDL);
    await this.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "MfaBackupCode_userId_idx" ON "MfaBackupCode"("userId")`,
    );
    await this.$executeRawUnsafe(MFA_CHALLENGE_DDL);
    await this.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "MfaChallenge_userId_idx" ON "MfaChallenge"("userId")`,
    );
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
      { timeout: 120_000, maxWait: 10_000 },
    );
  }

  /** Add `ALTER TABLE … ADD COLUMN` statements for columns the on-disk table
   *  lacks. Idempotent: existing columns are skipped. */
  private async addMissingColumns(
    table: string,
    additions: ReadonlyArray<readonly [name: string, ddl: string]>,
    columns: SqliteColumn[],
  ): Promise<void> {
    const existing = new Set(columns.map((c) => c.name));
    for (const [name, ddl] of additions) {
      if (existing.has(name)) continue;
      await this.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${ddl}`);
    }
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

/** Reader-rework columns added to pre-existing Bookmark tables at runtime. */
const BOOKMARK_ADDITIVE_COLUMNS: ReadonlyArray<readonly [name: string, ddl: string]> = [
  ["extractionReason", "TEXT"],
  ["extractionVersion", "INTEGER"],
  ["author", "TEXT"],
  ["publishedAt", "DATETIME"],
  ["readingTimeMinutes", "INTEGER"],
  ["readProgress", "REAL NOT NULL DEFAULT 0"],
  ["completedAt", "DATETIME"],
];

/** Columns added to pre-existing User tables at runtime. */
const USER_ADDITIVE_COLUMNS: ReadonlyArray<readonly [name: string, ddl: string]> = [
  ["preferences", "TEXT"],
  ["totpSecretEnc", "TEXT"],
  ["totpEnabledAt", "DATETIME"],
  ["avatarMime", "TEXT"],
  ["avatarUpdatedAt", "DATETIME"],
  ["avatarBytes", "BLOB"],
];

/** Columns added after EmailVerificationToken first shipped. */
const EMAIL_TOKEN_ADDITIVE_COLUMNS: ReadonlyArray<readonly [name: string, ddl: string]> = [
  ["attempts", "INTEGER NOT NULL DEFAULT 0"],
  ["purpose", "TEXT NOT NULL DEFAULT 'verify'"],
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

const USER_MIGRATION_DDL = `
CREATE TABLE "User_migration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" DATETIME,
    "pendingEmail" TEXT,
    "preferences" TEXT,
    "totpSecretEnc" TEXT,
    "totpEnabledAt" DATETIME,
    "avatarMime" TEXT,
    "avatarUpdatedAt" DATETIME,
    "avatarBytes" BLOB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_email_key" UNIQUE ("email")
)`;

const MFA_BACKUP_CODE_DDL = `
CREATE TABLE IF NOT EXISTS "MfaBackupCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MfaBackupCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`;

const MFA_CHALLENGE_DDL = `
CREATE TABLE IF NOT EXISTS "MfaChallenge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "payload" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MfaChallenge_tokenHash_key" UNIQUE ("tokenHash"),
    CONSTRAINT "MfaChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
)`;
