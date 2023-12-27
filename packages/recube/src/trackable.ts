import { scope } from './scope';
import { Listenable } from './types';

type Tracker = {
  track: (listenable: Listenable) => void;
};

export const trackable = scope(() => {
  const allListenableList = new Set<Listenable>();
  const activeWatchers = new Set<Tracker>();

  return {
    add(...listenables: Listenable[]) {
      const { size } = allListenableList;
      listenables.forEach(listenable => {
        allListenableList.add(listenable);
      });
      const hasChange = size !== allListenableList.size;
      if (hasChange) {
        activeWatchers.forEach(x => {
          listenables.forEach(listenable => x.track(listenable));
        });
      }
    },
    track(onChange: VoidFunction) {
      const unsubscribes: VoidFunction[] = [];
      const disposables: VoidFunction[] = [];
      const watcher: Tracker = {
        track(listenable) {
          unsubscribes.push(listenable.on(onChange));
        },
      };

      allListenableList.forEach(watcher.track);
      activeWatchers.add(watcher);

      return () => {
        activeWatchers.delete(watcher);
        unsubscribes.forEach(x => x());
        disposables.forEach(x => x());
      };
    },
  };
});
