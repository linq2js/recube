import { changeWatcher } from './changeWatcher';

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
    const [{ watch }, result] = changeWatcher.wrap(() => fn(context));
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
