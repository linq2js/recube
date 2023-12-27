import { scope } from './scope';

export const batchScope = scope(() => {
  const updaters = new Set<VoidFunction>();
  let count = 0;
  return {
    addUpdater(updater: VoidFunction) {
      updaters.add(updater);
      return true;
    },
    onEnter() {
      count++;
      updaters.clear();
    },
    onExit() {
      count--;
      if (!count) {
        updaters.forEach(x => x());
      }
    },
  };
});

export const batch = <T>(fn: () => T): T => {
  const [, result] = batchScope(fn);
  return result;
};
