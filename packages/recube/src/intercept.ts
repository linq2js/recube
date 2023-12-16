import { scope } from './scope';
import { Observable } from './types';

export const stateInterceptor = scope(() => {
  const observableList = new Set<Observable>();
  const disposableList = new Set<VoidFunction>();
  const activeWatchers = new Set<{ watch: (observable: Observable) => void }>();

  return {
    disposableList,
    addObservable(observable: Observable<any>) {
      const { size } = observableList;
      observableList.add(observable);
      const hasChange = size !== observableList.size;
      if (hasChange) {
        activeWatchers.forEach(x => x.watch(observable));
      }
    },
    addDisposable(dispose: VoidFunction) {
      disposableList.add(dispose);
    },
    watch(onChange: VoidFunction) {
      const unsubscribes: VoidFunction[] = [];
      const watcher = {
        watch(observable: Observable) {
          unsubscribes.push(observable.on(onChange));
        },
      };
      observableList.forEach(watcher.watch);
      activeWatchers.add(watcher);

      return () => {
        activeWatchers.delete(watcher);
        unsubscribes.forEach(x => x());
      };
    },
  };
});
