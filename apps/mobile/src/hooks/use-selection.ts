/**
 * Multi-select for library rows. Long-press enters the mode with one item;
 * further taps toggle. Android back exits without acting.
 */
import { useCallback, useState } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect } from "expo-router";
import { haptics } from "../lib/haptics";

export type SelectionKey = `bookmark:${string}` | `folder:${string}`;

export function bookmarkKey(id: string): SelectionKey {
  return `bookmark:${id}`;
}

export function folderKey(id: string): SelectionKey {
  return `folder:${id}`;
}

export const SELECTION_LONG_PRESS_MS = 400;

export function useSelectionMode() {
  const [active, setActive] = useState(false);
  const [ids, setIds] = useState<ReadonlySet<SelectionKey>>(() => new Set());
  const [revision, setRevision] = useState(0);

  const bump = useCallback((next: ReadonlySet<SelectionKey>, nextActive: boolean) => {
    setIds(next);
    setActive(nextActive);
    setRevision((value) => value + 1);
  }, []);

  const enter = useCallback(
    (key: SelectionKey) => {
      haptics.medium();
      bump(new Set([key]), true);
    },
    [bump],
  );

  const exit = useCallback(() => {
    bump(new Set(), false);
  }, [bump]);

  const toggle = useCallback((key: SelectionKey) => {
    haptics.selection();
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setActive(true);
    setRevision((value) => value + 1);
  }, []);

  const replace = useCallback(
    (keys: readonly SelectionKey[]) => {
      haptics.selection();
      bump(new Set(keys), true);
    },
    [bump],
  );

  useFocusEffect(
    useCallback(() => {
      if (!active) return undefined;
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        exit();
        return true;
      });
      return () => subscription.remove();
    }, [active, exit]),
  );

  return {
    active,
    ids,
    count: ids.size,
    revision,
    enter,
    exit,
    toggle,
    replace,
    has: (key: SelectionKey) => ids.has(key),
  };
}
