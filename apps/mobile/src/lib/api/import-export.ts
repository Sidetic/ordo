/**
 * Import / export API endpoints.
 */
import {
  FOLDER_TOKENS_HEADER,
  ImportExportRoutes,
  buildPath,
  type CommitImportInput,
  type ExportFormat,
  type ImportJobDto,
} from "@ordo/shared";
import { api } from "./client";

/** A file chosen with the document picker: {uri} on native, {file} on web. */
export interface PickedImportFile {
  uri?: string;
  file?: File;
  name: string;
  size?: number;
}

/** Long budgets for large transfers; polling stays on the default timeout. */
const UPLOAD_TIMEOUT_MS = 90_000;
const EXPORT_TIMEOUT_MS = 120_000;

export const importExportApi = {
  uploadImport: (picked: PickedImportFile) => {
    const form = new FormData();
    if (picked.file) {
      form.append("file", picked.file, picked.name);
    } else if (picked.uri) {
      form.append("file", { uri: picked.uri, name: picked.name, type: "text/plain" } as never);
    }
    return api.post<typeof ImportExportRoutes.uploadImport.response>(
      ImportExportRoutes.uploadImport.path,
      undefined,
      { formData: form, timeoutMs: UPLOAD_TIMEOUT_MS },
    );
  },

  getImport: (id: string) =>
    api.get<ImportJobDto>(buildPath(ImportExportRoutes.getImport.path, { id })),

  commitImport: (id: string, body: CommitImportInput, folderTokens: string[]) =>
    api.post<ImportJobDto>(buildPath(ImportExportRoutes.commitImport.path, { id }), body, {
      headers: folderTokens.length > 0 ? { [FOLDER_TOKENS_HEADER]: folderTokens.join(",") } : undefined,
    }),

  cancelImport: (id: string) =>
    api.delete<{ success: true }>(buildPath(ImportExportRoutes.cancelImport.path, { id })),

  /** Returns the raw Response; the filename comes from content-disposition. */
  requestExport: (format: ExportFormat, folderIds: string[], folderTokens: string[]) =>
    api.postBlob(
      ImportExportRoutes.export.path,
      { format, ...(folderIds.length > 0 ? { folderIds } : {}) },
      {
        headers: folderTokens.length > 0 ? { [FOLDER_TOKENS_HEADER]: folderTokens.join(",") } : undefined,
        timeoutMs: EXPORT_TIMEOUT_MS,
      },
    ),
};
