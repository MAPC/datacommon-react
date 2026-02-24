import React from 'react'
import shim from 'use-sync-external-store/shim'

const { useSyncExternalStore } = shim
const { useRef, useEffect, useMemo, useDebugValue } = React

function objectIs(x, y) {
  if (typeof Object.is === 'function') {
    return Object.is(x, y)
  }

  // Same-value equality fallback
  // Based on the official use-sync-external-store shim implementation
  return (
    (x === y && (x !== 0 || 1 / x === 1 / y)) ||
    (x !== x && y !== y)
  )
}

export function useSyncExternalStoreWithSelector(
  subscribe,
  getSnapshot,
  getServerSnapshot,
  selector,
  isEqual,
) {
  const instRef = useRef(null)

  if (instRef.current === null) {
    instRef.current = { hasValue: false, value: null }
  }

  const [getMemoizedSnapshot, getMemoizedServerSnapshot] = useMemo(() => {
    let hasMemo = false
    let memoizedSnapshot
    let memoizedSelection

    const maybeGetServerSnapshot =
      getServerSnapshot === undefined ? null : getServerSnapshot

    function memoizedSelector(nextSnapshot) {
      if (!hasMemo) {
        hasMemo = true
        memoizedSnapshot = nextSnapshot
        let nextSelection = selector(nextSnapshot)

        if (isEqual !== undefined && instRef.current.hasValue) {
          const currentSelection = instRef.current.value
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection
            return memoizedSelection
          }
        }

        memoizedSelection = nextSelection
        return memoizedSelection
      }

      const currentSelection = memoizedSelection

      if (objectIs(memoizedSnapshot, nextSnapshot)) {
        return currentSelection
      }

      const nextSelection = selector(nextSnapshot)

      if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot
        return currentSelection
      }

      memoizedSnapshot = nextSnapshot
      memoizedSelection = nextSelection
      return memoizedSelection
    }

    return [
      () => memoizedSelector(getSnapshot()),
      maybeGetServerSnapshot === null
        ? undefined
        : () => memoizedSelector(maybeGetServerSnapshot()),
    ]
  }, [getSnapshot, getServerSnapshot, selector, isEqual])

  const value = useSyncExternalStore(
    subscribe,
    getMemoizedSnapshot,
    getMemoizedServerSnapshot,
  )

  useEffect(() => {
    instRef.current.hasValue = true
    instRef.current.value = value
  }, [value])

  useDebugValue(value)

  return value
}

