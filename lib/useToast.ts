"use client";

import { useCallback, useRef, useState } from "react";

export function useToast(timeoutMs = 2400) {
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  const hide = useCallback(() => {
    setOpen(false);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (nextMessage: string) => {
      setMessage(nextMessage);
      setOpen(true);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setOpen(false);
        timerRef.current = null;
      }, timeoutMs);
    },
    [timeoutMs]
  );

  return { message, open, show, hide };
}
