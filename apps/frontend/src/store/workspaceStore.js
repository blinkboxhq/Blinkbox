import { create } from "zustand";
import { createGraphSlice } from "./createGraphSlice";
import { createExecutionSlice } from "./createExecutionSlice";
import { createUISlice } from "./createUISlice";

// ─────────────────────────────────────────────────────────────────────────────
// Merged Store — Zustand "Slice Pattern"
//
// Each slice owns its own state + actions. They share the same (set, get) so
// cross-slice reads (e.g. execution reading nodes) work transparently.
// Components subscribe via selectors: useWorkspaceStore(s => s.nodes) — only
// re-renders when that specific slice of state changes.
// ─────────────────────────────────────────────────────────────────────────────

const useWorkspaceStore = create((...args) => ({
  ...createGraphSlice(...args),
  ...createExecutionSlice(...args),
  ...createUISlice(...args),
}));

export default useWorkspaceStore;
