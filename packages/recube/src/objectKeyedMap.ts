import { equal } from '@wry/equality';
import { AnyFunc, NoInfer } from './types';

const isObject = (value: any) => {
  return typeof value === 'object' && value;
};

export type MapOptions<K, V> = {
  onRemove?: (value: NoInfer<V>, key: NoInfer<K>) => void;
};

export const objectKeyedMap = <K, V>({ onRemove }: MapOptions<K, V> = {}) => {
  type Item = { key: K; value: V };
  const list: Item[] = [];
  const map = new Map<any, Item>();

  const find = (key: K) => {
    const loc = isObject(key) ? ('list' as const) : ('map' as const);
    if (loc === 'map') {
      return {
        loc,
        index: 0,
        item: map.get(key),
      };
    }
    const index = list.findIndex(x => equal(x.key, key));
    return {
      loc,
      index,
      item: index === -1 ? undefined : list[index],
    };
  };

  const get = (key: K) => {
    return find(key).item?.value;
  };

  const getOrAdd = (key: K, create: (key: NoInfer<K>) => V) => {
    const { item, loc } = find(key);

    if (!item) {
      const value = create(key);
      if (loc === 'map') {
        map.set(key, { value, key });
      } else {
        list.push({ value, key });
      }
      return value;
    }

    return item.value;
  };

  return {
    get,
    getOrAdd,
    get size() {
      return map.size + list.length;
    },
    clear() {
      if (onRemove) {
        map.forEach(x => onRemove(x.value, x.key));
        list.forEach(x => onRemove(x.value, x.key));
      }
      map.clear();
      list.length = 0;
    },
    forEach(callback: (value: V, key: K) => void) {
      map.forEach(x => callback(x.value, x.key));
      list.forEach(x => callback(x.value, x.key));
    },
    delete(keyOrFilter: K | ((value: V, key: K) => boolean)) {
      if (typeof keyOrFilter === 'function') {
        const filter = keyOrFilter as AnyFunc;
        const removedKeys: K[] = [];
        const removedIndices: number[] = [];
        map.forEach(x => {
          if (filter(x.value, x.key)) {
            onRemove?.(x.value, x.key);
            removedKeys.push(x.key);
          }
        });
        list.forEach((x, i) => {
          if (filter(x.value, x.key)) {
            onRemove?.(x.value, x.key);
            removedIndices.push(i);
          }
        });
        while (removedKeys.length) {
          map.delete(removedKeys.pop());
        }
        while (removedIndices.length) {
          list.splice(removedIndices.pop() ?? 0, 1);
        }
      } else {
        const key = keyOrFilter;
        const { loc, index, item } = find(key);
        if (!item) {
          return;
        }

        onRemove?.(item.value, item.key);

        if (loc === 'map') {
          map.delete(key);
        } else {
          list.splice(index, 1);
        }
      }
    },
  };
};
