import { useEffect, useMemo, useRef } from 'react';
import { effect } from '../effect';
import { Equal, NoInfer } from '../types';
import { useRerender } from './useRerender';

export const useComputed = <T>(
  fn: () => T,
  equal: Equal<NoInfer<T>> = Object.is,
): T => {
  const rerender = useRerender();
  const unwatchRef = useRef<VoidFunction>();
  const prevRef = useRef<any>();
  const handleEffect = (force?: boolean) => {
    if (!force && unwatchRef.current) {
      return;
    }
    unwatchRef.current?.();
    unwatchRef.current = effect(({ count }) => {
      const next = fn();
      const isFirstRun = !count;
      // change prev result to next result at first time or if it does not equal to next result
      if (isFirstRun) {
        prevRef.current = next;
      } else if (!equal(prevRef.current, next)) {
        prevRef.current = next;
        rerender();
      }
    });
  };

  useMemo(() => {
    handleEffect(true);
  }, [fn, equal]);

  useEffect(() => {
    handleEffect();

    return () => {
      unwatchRef.current?.();
      unwatchRef.current = undefined;
    };
  }, []);

  return prevRef.current;
};
