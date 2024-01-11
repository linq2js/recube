import { ReactNode, createElement, memo, useEffect, useRef } from 'react';
import { trackable } from '../trackable';
import { AnyFunc, Equal, NoInfer } from '../types';
import { useRerender } from './useRerender';

/**
 * there are 2 characteristics of rx()
 * 1. rx(stateFn) => the Part should not re-render even its parent component re-renders because stateFn is constant
 * 2. rx(customFn) => the Part should re-render to ensure the function result is up to date
 */
const Part = memo((props: { fn: AnyFunc; equal?: Equal }) => {
  const rerender = useRerender();
  const trackedRef = useRef<{ result: any; untrack: VoidFunction }>();
  const startTracking = () => {
    // already track
    if (trackedRef.current) {
      return trackedRef.current.result;
    }

    const [{ track }, result] = trackable(props.fn);

    trackedRef.current = {
      result,
      untrack: track(rerender),
    };

    return result;
  };

  useEffect(() => {
    // in strict mode, it re-renders twice
    startTracking();

    return () => {
      trackedRef.current?.untrack();
      trackedRef.current = undefined;
    };
  });

  trackedRef.current = undefined;

  return startTracking();
});

export const rx = <T>(fn: () => T, equal?: Equal<NoInfer<T>>): ReactNode => {
  return createElement(Part, { fn, equal });
};
