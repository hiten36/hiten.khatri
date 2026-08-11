import { useEffect, useState } from "react";

/** Keep a surface mounted through its exit transition. */
export function usePresence(open: boolean, durationMs = 220) {
  const [present, setPresent] = useState(open);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setActive(true));
      });
      return () => cancelAnimationFrame(id);
    }

    setActive(false);
    if (durationMs <= 0) {
      setPresent(false);
      return;
    }

    const t = window.setTimeout(() => setPresent(false), durationMs);
    return () => window.clearTimeout(t);
  }, [open, durationMs]);

  return { present, active };
}
