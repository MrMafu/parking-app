import { useEffect, useRef, useState, useCallback } from "react";

interface RfidReaderState {
  tagId: string | null;
  isReading: boolean;
  scanCount: number;
  lastScanTime: Date | null;
}

interface UseRfidReaderOptions {
  /** Max milliseconds between keystrokes to consider it reader input (default: 50) */
  maxKeystrokeGap?: number;
  /** Minimum tag length to accept (default: 4) */
  minTagLength?: number;
  /** Whether the hook is active (default: true) */
  enabled?: boolean;
}

export function useRfidReader(options: UseRfidReaderOptions = {}) {
  const { maxKeystrokeGap = 50, minTagLength = 4, enabled = true } = options;

  const [state, setState] = useState<RfidReaderState>({
    tagId: null,
    isReading: false,
    scanCount: 0,
    lastScanTime: null,
  });

  const bufferRef = useRef("");
  const lastKeystrokeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAcceptedTagRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setState({ tagId: null, isReading: false, scanCount: 0, lastScanTime: null });
    bufferRef.current = "";
    lastKeystrokeRef.current = 0;
    lastAcceptedTagRef.current = null;
  }, []);

  const clearBuffer = useCallback(() => {
    bufferRef.current = "";
    setState((prev) => ({ ...prev, isReading: false }));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const elapsed = now - lastKeystrokeRef.current;

      // Enter key signals end of reader input
      if (e.key === "Enter") {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        const tag = bufferRef.current.trim();
        if (tag.length >= minTagLength) {
          // Skip if this is the same tag as last accepted (held or re-swiped)
          if (tag === lastAcceptedTagRef.current) {
            bufferRef.current = "";
            lastKeystrokeRef.current = 0;
            return;
          }

          // Prevent the Enter from triggering form submissions etc.
          e.preventDefault();
          e.stopPropagation();

          lastAcceptedTagRef.current = tag;

          setState((prev) => ({
            tagId: tag,
            isReading: false,
            scanCount: prev.scanCount + 1,
            lastScanTime: new Date(),
          }));
        }
        bufferRef.current = "";
        lastKeystrokeRef.current = 0;
        return;
      }

      // Only collect printable single characters
      if (e.key.length !== 1) return;

      // If too much time passed since last keystroke, this is a new sequence
      if (elapsed > maxKeystrokeGap && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      bufferRef.current += e.key;
      lastKeystrokeRef.current = now;

      if (bufferRef.current.length >= 2) {
        setState((prev) => ({ ...prev, isReading: true }));
      }

      // Auto-clear buffer if no more input arrives (reader stalled or false positive)
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(clearBuffer, maxKeystrokeGap * 3);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, maxKeystrokeGap, minTagLength, clearBuffer]);

  return { ...state, reset };
}
