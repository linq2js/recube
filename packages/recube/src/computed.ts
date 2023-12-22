import { useEffect, useRef, useState } from 'react';
import { changeWatcher } from './changeWatcher';
import { AsyncResult, Equal, NoInfer } from './types';
import { state } from './state';
import { NOOP } from './utils';
import { effect } from './effect';

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

export const computed = <T>(
  fn: () => T,
  equal?: Equal<NoInfer<T>>,
): T extends Promise<infer D> ? AsyncResult<D> : T => {
  const computedState = state(fn);
  if (equal) {
    computedState.distinct(equal);
  }
  const interceptor = changeWatcher.current();
  const result = computedState();
  // we just return state value if the computed() runs outside state interceptor scope
  // This means we don't need to listen state change event or state's dependencies change event anymore
  // just clear all state instances and dispose the state immediately
  if (!interceptor) {
    computedState.wipe();
  }
  return result;
};
