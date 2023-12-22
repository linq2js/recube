import { equal } from '@wry/equality';
import { AnyFunc, NoInfer } from './types';
import { isObject } from './utils';

export type Create<K, V> = (key: K) => V;

export type WithCreateOptions<K, V> = { create: Create<K, V> };

export type MapOptions<K, V> = {
  onRemove?: (value: NoInfer<V>, key: NoInfer<K>) => void;
};

export type ObjectKeyedMap<K, V, THasCreate extends boolean = false> = {
  get: (key: K) => THasCreate extends true ? V : V | undefined;
  readonly size: number;
  clear: () => void;
  forEach: (callback: (value: V, key: K) => void) => void;
  delete: (keyOrFilter: K | ((value: V, key: K) => boolean)) => void;
};

export type CreateObjectKeyedMap = {
  <K, V>(options: WithCreateOptions<K, V> & MapOptions<K, V>): ObjectKeyedMap<
    K,
    V,
    true
  >;

  <K, V>(options: MapOptions<K, V>): ObjectKeyedMap<K, V>;
};

export const objectKeyedMap: CreateObjectKeyedMap = (options = {}) => {
  const { create, onRemove } = options as MapOptions<any, any> &
    WithCreateOptions<any, any>;
  type Item = { key: any; value: any };
  const list: Item[] = [];
  const map = new Map<any, Item>();

  const find = (key: any) => {
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

  const get = (key: any) => {
    const { item, loc } = find(key);

    if (!item) {
      if (!create) {
        return undefined;
      }

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
    forEach(callback: (value: any, key: any) => void) {
      map.forEach(x => callback(x.value, x.key));
      list.forEach(x => callback(x.value, x.key));
    },
    delete(keyOrFilter: any) {
      if (typeof keyOrFilter === 'function') {
        const filter = keyOrFilter as AnyFunc;
        const removedKeys: any[] = [];
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
