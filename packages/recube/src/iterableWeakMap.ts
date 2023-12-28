import { enqueue } from './utils';

export const iterableWeakMap = <K extends object, V>(entries?: [K, V][]) => {
  let map = new WeakMap<K, V>();
  const refs = new Set<WeakRef<K>>();
  const queue = new Map<K, WeakRef<K>>();
  let changed = {};

  const merge = () => {
    if (queue.size) {
      changed = {};
      queue.forEach(ref => refs.add(ref));
      queue.clear();
    }
  };

  entries?.forEach(([key, value]) => {
    map.set(key, value);
    refs.add(new WeakRef(key));
  });

  const instance = {
    get(key: K) {
      return map.get(key);
    },
    set(key: K, value: V) {
      map.set(key, value);
      changed = {};
      const token = changed;
      queue.set(key, new WeakRef(key));
      enqueue(() => {
        if (token !== changed) {
          return;
        }
        merge();
      });
    },
    size() {
      merge();
      let size = 0;
      instance.forEach(() => size++);
      return size;
    },
    delete(key: K) {
      map.delete(key);
      queue.delete(key);
    },
    clear() {
      map = new WeakMap();
      changed = {};
      refs.clear();
      queue.clear();
    },
    entries() {
      const entries: [K, V][] = [];
      instance.forEach((value, key) => {
        entries.push([key, value]);
      });
      return entries;
    },
    clone() {
      return iterableWeakMap(instance.entries());
    },
    map<N>(mapper: (value: V, key: K) => N) {
      const entries: [K, N][] = [];
      instance.forEach((value, key) => {
        entries.push([key, mapper(value, key)]);
      });
      return iterableWeakMap(entries);
    },
    forEach(callback: (value: V, key: K) => void) {
      merge();
      const removed: WeakRef<K>[] = [];

      try {
        refs.forEach(ref => {
          const key = ref.deref();

          if (!key) {
            removed.push(ref);
          } else {
            callback(map.get(key) as V, key);
          }
        });
      } finally {
        removed.splice(-removed.length).forEach(ref => refs.delete(ref));
      }
    },
  };

  return instance;
};
