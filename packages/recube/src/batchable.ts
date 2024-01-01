import { scope } from './scope';

export const batchable = scope(() => {
  const updaters = new Set<VoidFunction>();
  let count = 0;

  return {
    add(updater: VoidFunction) {
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

export const batch = <T>(fn: () => T): T => batchable(fn)[1];
