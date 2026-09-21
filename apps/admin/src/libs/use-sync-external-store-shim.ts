import * as React from 'react';

const objectIs = Object.is;

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: undefined | null | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
  const instRef = React.useRef<{
    hasValue: boolean;
    value: Selection | null;
  } | null>(null);
  let inst: { hasValue: boolean; value: Selection | null };
  if (instRef.current === null) {
    inst = { hasValue: false, value: null };
    instRef.current = inst;
  } else {
    inst = instRef.current;
  }

  const [getSelection, getServerSelection] = React.useMemo(() => {
    let hasMemo = false;
    let memoizedSnapshot: Snapshot;
    let memoizedSelection: Selection;

    const memoizedSelector = (nextSnapshot: Snapshot) => {
      if (!hasMemo) {
        hasMemo = true;
        memoizedSnapshot = nextSnapshot;
        const nextSelection = selector(nextSnapshot);
        if (isEqual !== undefined && inst.hasValue) {
          const currentSelection = inst.value as Selection;
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection;
            return currentSelection;
          }
        }
        memoizedSelection = nextSelection;
        return nextSelection;
      }
      const currentSelection = memoizedSelection;
      if (objectIs(memoizedSnapshot, nextSnapshot)) {
        return currentSelection;
      }
      const nextSelection = selector(nextSnapshot);
      if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot;
        return currentSelection;
      }
      memoizedSnapshot = nextSnapshot;
      memoizedSelection = nextSelection;
      return nextSelection;
    };

    const maybeGetServerSnapshot =
      getServerSnapshot === undefined ? null : getServerSnapshot;

    return [
      () => memoizedSelector(getSnapshot()),
      maybeGetServerSnapshot === null
        ? undefined
        : () => memoizedSelector(maybeGetServerSnapshot()),
    ];
  }, [getSnapshot, getServerSnapshot, selector, isEqual, inst]);

  const value = React.useSyncExternalStore(
    subscribe,
    getSelection,
    getServerSelection,
  );

  React.useEffect(() => {
    inst.hasValue = true;
    inst.value = value;
  }, [inst, value]);

  React.useDebugValue(value);
  return value;
}

export default { useSyncExternalStoreWithSelector };
