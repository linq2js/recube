import { useEffect, useRef, useState } from 'react';
import { NOOP } from '../utils';
import { effect } from '../effect';
import { Equal, NoInfer } from '../types';

export const useComputed = <T>(
  fn: () => T,
  equal: Equal<NoInfer<T>> = Object.is,
): T => {
  const rerender = useState({})[1];
  const unwatchRef = useRef(NOOP);
  unwatchRef.current();

  useEffect(() => () => unwatchRef.current(), []);

  let prev: any;
  unwatchRef.current = effect(({ count }) => {
    const next = fn();
    const isFirstRun = !count;
    // change prev result to next result at first time or if it does not equal to next result
    if (isFirstRun) {
      prev = next;
    } else if (!equal(prev, next)) {
      prev = next;
      rerender({});
    }
  });

  return prev;
};
