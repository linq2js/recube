import { isPromiseLike } from './utils';
import { trackable } from './trackable';
import { Equal, NoInfer } from './types';

export type EffectContext = {
  /**
   * number of effect run
   */
  readonly count: number;
};

/**
 *
 * @param fn
 * @returns
 */
export const effect = (
  fn: (context: EffectContext) => void | VoidFunction,
): VoidFunction => {
  let unwatch: VoidFunction | undefined;
  let dispose: VoidFunction | undefined;
  const context = { count: 0 };
  const runEffect = () => {
    unwatch?.();
    const [{ track: watch }, result] = trackable(() => fn(context));
    dispose = typeof result === 'function' ? result : undefined;
    context.count++;
    unwatch = watch(runEffect);
  };

  runEffect();

  return () => {
    unwatch?.();
    dispose?.();
  };
};

/**
 *
 * @param evaluate
 * @param callback
 * @param equal
 * @returns
 */

export const watch = <T>(
  evaluate: () => T | PromiseLike<T>,
  callback: (value: T) => void,
  equal: Equal<NoInfer<T>> = Object.is,
): VoidFunction => {
  let prev: { value: T } | undefined;
  let changedToken = {};

  const setValue = (value: T) => {
    changedToken = {};
    if (!prev) {
      prev = { value };
    } else if (!equal(prev.value, value)) {
      prev = { value };
      callback(value);
    }
  };

  return effect(() => {
    const next = evaluate();
    if (isPromiseLike<T>(next)) {
      changedToken = {};
      const prevChangedToken = changedToken;
      next.then(value => {
        if (prevChangedToken !== changedToken) {
          return;
        }
        setValue(value);
      });
    } else {
      setValue(next as T);
    }
  });
};
