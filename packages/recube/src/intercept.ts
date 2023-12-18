import { scope } from './scope';
import { Listenable } from './types';

export const stateInterceptor = scope(() => {
  const listenableList = new Set<Listenable>();
  const disposableList = new Set<VoidFunction>();
  const activeWatchers = new Set<{ watch: (listenable: Listenable) => void }>();

  return {
    disposableList,
    addListenable(...listenables: Listenable[]) {
      const { size } = listenableList;
      listenables.forEach(listenable => {
        listenableList.add(listenable);
      });
      const hasChange = size !== listenableList.size;
      if (hasChange) {
        activeWatchers.forEach(x => {
          listenables.forEach(listenable => x.watch(listenable));
        });
      }
    },
    addDisposable(dispose: VoidFunction) {
      disposableList.add(dispose);
    },
    watch(onChange: VoidFunction) {
      const unsubscribes: VoidFunction[] = [];
      const watcher = {
        watch(listenable: Listenable) {
          unsubscribes.push(listenable.on(onChange));
        },
      };
      listenableList.forEach(watcher.watch);
      activeWatchers.add(watcher);

      return () => {
        activeWatchers.delete(watcher);
        unsubscribes.forEach(x => x());
      };
    },
  };
});
