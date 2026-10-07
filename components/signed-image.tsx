"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

/** Short-lived URL for a file in a private bucket (thumbnails, screenshots). Team members only, via storage RLS. */
export function useSignedUrl(bucket: "thumbnails" | "screenshots", path: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!path) return;
    supabaseBrowser()
      .storage.from(bucket)
      .createSignedUrl(path, 3600)
      .then(({ data }) => alive && setUrl(data?.signedUrl ?? null));
    return () => {
      alive = false;
    };
  }, [bucket, path]);
  return path ? url : null;
}
