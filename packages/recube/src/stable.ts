import { AnyFunc } from './types';
import { NOOP } from './utils';

export const stableCallbackMap = () => {
  const callbacks = new Map<string, { original: AnyFunc; wrapper: AnyFunc }>();
  return {
    clear() {
      callbacks.clear();
    },
    get(name: string, original: AnyFunc) {
      const existingItem = callbacks.get(name);
      if (existingItem) {
        existingItem.original = original;
        return existingItem.wrapper;
      }
      const newItem = { original, wrapper: NOOP };
      newItem.wrapper = (...args: any[]) => {
        return newItem.original(...args);
      };
      callbacks.set(name, newItem);
      return newItem.wrapper;
    },
  };
};
