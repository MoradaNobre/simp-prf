import { supabase } from "@/integrations/supabase/client";

const SIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

/**
 * Upload a file to os-fotos bucket and return a signed URL (not public).
 * Stores only the storage path in the database.
 */
export async function uploadToStorage(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("os-fotos").upload(path, file);
  if (error) throw error;
  // Store only the path, not the full URL
  return path;
}

/**
 * Generate a signed URL for a storage path.
 * Handles both legacy full URLs and new path-only references.
 */
export async function getSignedUrl(pathOrUrl: string): Promise<string | null> {
  const storagePath = extractPath(pathOrUrl);
  if (!storagePath) return pathOrUrl; // fallback for external URLs

  const { data, error } = await supabase.storage
    .from("os-fotos")
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (error) {
    console.error("Failed to create signed URL:", error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Generate signed URLs for multiple paths.
 */
export async function getSignedUrls(paths: string[]): Promise<(string | null)[]> {
  return Promise.all(paths.map(getSignedUrl));
}

/**
 * Extract the storage path from a full public URL or return as-is if already a path.
 */
function extractPath(pathOrUrl: string): string | null {
  if (!pathOrUrl) return null;

  // Already a relative path (new format)
  if (!pathOrUrl.startsWith("http")) return pathOrUrl;

  // Legacy full URL format: .../storage/v1/object/public/os-fotos/path
  const publicMatch = pathOrUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/os-fotos\/(.+)/);
  if (publicMatch) return decodeURIComponent(publicMatch[1].split("?")[0]);

  // Not a storage URL, return null to use as-is
  return null;
}
