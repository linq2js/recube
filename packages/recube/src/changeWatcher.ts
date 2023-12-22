import { scope } from './scope';
import { Listenable } from './types';

type Watcher = {
  watch: (listenable: Listenable) => void;
};

export const changeWatcher = scope(() => {
  const allListenableList = new Set<Listenable>();
  const activeWatchers = new Set<Watcher>();

  return {
    addListenable(...listenables: Listenable[]) {
      const { size } = allListenableList;
      listenables.forEach(listenable => {
        allListenableList.add(listenable);
      });
      const hasChange = size !== allListenableList.size;
      if (hasChange) {
        activeWatchers.forEach(x => {
          listenables.forEach(listenable => x.watch(listenable));
        });
      }
    },
    watch(onChange: VoidFunction) {
      const unsubscribes: VoidFunction[] = [];
      const disposables: VoidFunction[] = [];
      const watcher: Watcher = {
        watch(listenable) {
          unsubscribes.push(listenable.on(onChange));
        },
      };

      allListenableList.forEach(watcher.watch);
      activeWatchers.add(watcher);

      return () => {
        activeWatchers.delete(watcher);
        unsubscribes.forEach(x => x());
        disposables.forEach(x => x());
      };
    },
  };
});
