import { trackable } from './trackable';
import { emitter } from './emitter';
import { AnyFunc } from './types';

export type LazyValueState = 'unset' | 'error' | 'ready';

export type LazyValue<T> = {
  (): T;
  status: () => LazyValueState;
  peek: () => T | undefined;
  error: () => any;
  reset: () => void;
};

export type LazyValueOptions = { track?: boolean };

export type LazyValueFn = <T>(
  creator: () => T,
  options?: LazyValueOptions,
) => LazyValue<T>;

export const lazyValue: LazyValueFn = (
  creator: AnyFunc,
  { track }: LazyValueOptions = {},
) => {
  let cache: { value: any; type: Exclude<LazyValueState, 'unset'> } | undefined;
  let unwatch: VoidFunction | undefined;
  const onReset = emitter<void>();

  const getResult = () => {
    if (cache?.type === 'error') {
      throw cache.value;
    }

    return cache?.value;
  };

  const reset = () => {
    if (cache) {
      cache = undefined;
      unwatch?.();
      onReset.emit();
    }
  };

  return Object.assign(
    () => {
      if (!cache) {
        try {
          unwatch?.();
          onReset.clear();
          const [{ track: watch }, value] = trackable(creator);
          cache = { value, type: 'ready' };
          unwatch = watch(reset);
        } catch (ex) {
          cache = { value: ex, type: 'error' };
        }
      }

      const result = getResult();

      if (track) {
        trackable()?.add(onReset);
      }

      return result;
    },
    {
      error() {
        return cache?.type === 'error' ? cache.value : undefined;
      },
      status() {
        return cache?.type || 'unset';
      },
      reset,
      peek() {
        return cache && getResult();
      },
    },
  );
};
