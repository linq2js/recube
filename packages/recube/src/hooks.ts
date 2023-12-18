import { useEffect, useState } from 'react';
import { stateInterceptor } from './intercept';

export const useComputed = <T>(fn: () => T) => {
  const rerender = useState({})[1];
  const [ref] = useState(() => ({
    value: null as unknown as T,
    unwatch: undefined as VoidFunction | undefined,
  }));
  ref.unwatch?.();
  const [{ watch }, result] = stateInterceptor.apply(fn);
  ref.value = result;
  ref.unwatch = watch(() => rerender({}));

  useEffect(
    () => () => {
      ref.unwatch?.();
    },
    [ref],
  );
  return result;
};
