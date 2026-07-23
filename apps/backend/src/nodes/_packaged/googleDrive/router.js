/**
 * Google Drive — operation router. Merges every v1 resource map into one
 * dispatch table; handlers are called `(config, token, context)` exactly as
 * the monolith did (context is unused today but preserved).
 */
import { handleError } from "./GenericFunctions.js";
import { fileOperations } from "./v1/FileDescription.js";
import { permissionOperations } from "./v1/PermissionDescription.js";
import { driveOperations } from "./v1/DriveDescription.js";

export const OPERATIONS = {
  ...fileOperations,
  ...permissionOperations,
  ...driveOperations,
};

export const DEFAULT_OPERATION = "listFiles";

export const OPERATION_SCHEMA = {
  listFiles: { description: "List files in a folder or the whole drive", recommended: true },
  search: { description: "Search files by name or full text", recommended: true },
  getFile: { description: "Read a file's metadata" },
  createFolder: { description: "Create a folder" },
  uploadText: { description: "Create a text file from content", recommended: true },
  downloadText: { description: "Download a file's content as text", recommended: true },
  exportFile: { description: "Export a Google Doc/Sheet/Slide to another format" },
  copyFile: { description: "Copy a file" },
  renameFile: { description: "Rename a file or folder" },
  updateFileContent: { description: "Replace a file's content" },
  moveFile: { description: "Move a file to another folder" },
  deleteFile: { description: "Permanently delete a file" },
  trashFile: { description: "Move a file to the trash" },
  restoreFile: { description: "Restore a file from the trash" },
  emptyTrash: { description: "Permanently empty the trash" },
  starFile: { description: "Star or unstar a file" },
  shareFile: { description: "Share a file with a user or make it public", recommended: true },
  createSharedLink: { description: "Create an anyone-with-link share URL" },
  listPermissions: { description: "List who has access to a file" },
  updatePermission: { description: "Change a collaborator's access level" },
  removePermission: { description: "Revoke a collaborator's access" },
  listDrives: { description: "List shared drives" },
  getAbout: { description: "Read storage quota and account info" },
};

export async function run(config, req, context = {}) {
  const op = config.operation || DEFAULT_OPERATION;
  const handler = OPERATIONS[op];
  if (!handler) return { success: false, error: `Google Drive: Unknown operation "${op}".`, skipped: true };
  try {
    return await handler(config, req, context);
  } catch (err) {
    handleError(err);
  }
}
