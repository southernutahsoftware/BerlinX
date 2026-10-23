// The labels, for an Atomico element that re-renders when they change. Kept
// apart from labels.js so toast() and confirm() do not pull in Atomico.

import { useEffect, useUpdate } from "atomico";
import { labels, listeners } from "./labels.js";

export function useLabels() {
  const update = useUpdate();
  useEffect(() => {
    listeners.add(update);
    return () => listeners.delete(update);
  }, []);
  return labels;
}
