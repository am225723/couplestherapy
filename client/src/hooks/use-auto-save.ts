import { useEffect, useCallback, useRef } from "react";

interface AutoSaveOptions {
  key: string;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave<T>(
  data: T,
  options: AutoSaveOptions,
): {
  loadDraft: () => T | null;
  clearDraft: () => void;
  hasDraft: () => boolean;
} {
  const { key, debounceMs = 1000, enabled = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const storageKey = `aleic_draft_${key}`;

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const hasData =
          typeof data === "object"
            ? Object.keys(data as object).length > 0
            : Boolean(data);

        if (hasData) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              data,
              savedAt: Date.now(),
            }),
          );
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, storageKey, debounceMs, enabled]);

  const loadDraft = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      if (parsed.savedAt && parsed.savedAt < oneDayAgo) {
        localStorage.removeItem(storageKey);
        return null;
      }

      return parsed.data as T;
    } catch {
      return null;
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const hasDraft = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return false;

      const parsed = JSON.parse(saved);
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      if (parsed.savedAt && parsed.savedAt < oneDayAgo) {
        localStorage.removeItem(storageKey);
        return false;
      }

      const hasData =
        typeof parsed.data === "object"
          ? Object.keys(parsed.data).length > 0
          : Boolean(parsed.data);

      return hasData;
    } catch {
      return false;
    }
  }, [storageKey]);

  return { loadDraft, clearDraft, hasDraft };
}
