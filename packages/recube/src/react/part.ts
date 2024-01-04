import { ReactNode, createElement, useEffect, useRef } from 'react';
import { trackable } from '../trackable';
import { AnyFunc } from '../types';
import { useRerender } from './useRerender';

const Part = (props: { fn: AnyFunc }) => {
  const rerender = useRerender();
  const trackedRef = useRef<{ result: any; untrack: VoidFunction }>();
  const startTracking = () => {
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
};

export const part = <T>(fn: () => T): ReactNode => {
  return createElement(Part, { fn });
};
