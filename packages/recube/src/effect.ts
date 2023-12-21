import { stateInterceptor } from './intercept';

export type EffectContext = {
  /**
   * indicate number of effect running
   */
  readonly count: number;
};

export const effect = (fn: (context: EffectContext) => void): VoidFunction => {
  let unwatch: VoidFunction | undefined;
  const context = { count: 0 };
  const runEffect = () => {
    unwatch?.();
    const [{ watch }] = stateInterceptor.wrap(() => fn(context));
    context.count++;
    unwatch = watch(runEffect);
  };

  runEffect();

  return () => {
    unwatch?.();
  };
};
