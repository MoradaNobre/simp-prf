import { useState, useEffect } from "react";
import { getSignedUrl } from "@/utils/storage";

/**
 * Hook to resolve a storage path/URL to a signed URL.
 * Returns null while loading.
 */
export function useSignedUrl(pathOrUrl: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pathOrUrl) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    getSignedUrl(pathOrUrl).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => { cancelled = true; };
  }, [pathOrUrl]);

  return url;
}
