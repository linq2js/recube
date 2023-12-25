import { changeWatcher } from './changeWatcher';
import { AsyncResult, Equal, NoInfer } from './types';
import { state } from './state';
import { disposableScope } from './disposableScope';

export const computed = <T>(
  fn: () => T,
  equal?: Equal<NoInfer<T>>,
): T extends Promise<infer D> ? AsyncResult<D> : T => {
  const computedState = state(fn);
  if (equal) {
    computedState.distinct(equal);
  }
  const watcher = changeWatcher.current();
  const result = computedState();
  // we just return state value if the computed() runs outside change watching scope
  // This means we don't need to listen state change event or state's dependencies change event anymore
  // just clear all state instances and dispose the state immediately
  if (!watcher) {
    computedState.wipe();
  }

  disposableScope.current()?.onDispose(computedState.wipe);

  return result;
};
