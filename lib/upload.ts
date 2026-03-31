import { promises as fs } from "fs";
import path from "path";

const FILE_API_PREFIX = "/api/files/";

export type UploadResult = {
  relativePath: string;
  publicUrl: string;
  originalName: string;
  storedFileName: string;
};

export function buildPublicUrl(relativePath: string) {
  return `${FILE_API_PREFIX}${relativePath}`.replace(/\\/g, "/");
}

export function stripPublicUrl(url: string) {
  const trimmed = url.trim();
  if (trimmed.startsWith(FILE_API_PREFIX)) {
    return trimmed.slice(FILE_API_PREFIX.length);
  }
  return trimmed;
}

export function getAbsolutePath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.includes("\0") ||
    normalized.split("/").some((segment) => segment === "..")
  ) {
    throw new Error("Invalid upload path.");
  }
  return path.join(process.cwd(), "uploads", normalized);
}

const sanitizeFileName = (fileName: string) =>
  fileName.replace(/[^\w.\-]/g, "_").replace(/_+/g, "_");

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

export async function storeUpload(
  fileName: string,
  buffer: Buffer,
  targetFolder = "templates"
): Promise<UploadResult> {
  const safeName = sanitizeFileName(fileName);
  const storedFileName = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;
  const relativePath = path.posix.join(targetFolder, storedFileName);
  const absolutePath = getAbsolutePath(relativePath);

  await ensureDir(path.dirname(absolutePath));
  await fs.writeFile(absolutePath, buffer);

  return {
    relativePath,
    publicUrl: buildPublicUrl(relativePath),
    originalName: fileName,
    storedFileName,
  };
}
