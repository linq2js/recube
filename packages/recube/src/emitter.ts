import { Listener, NoInfer, Listenable } from './types';

export type Emitter<T> = Listenable<T> & {
  size: () => number;
  emit: (args: T) => void;
  emitted: () => boolean;
  last: () => T | undefined;
  dispose: () => void;
};

export type EmitterOptions<T> = {
  onDispose?: VoidFunction;
  equal?: (a: T, b: T) => boolean;
};

export const emitter = <T = void>({
  onDispose,
  equal,
}: EmitterOptions<NoInfer<T>> = {}): Emitter<T> => {
  let emitting = false;
  let emitted = false;
  let last: any;
  let disposed = false;
  const unsubscribeMap = new WeakMap<Listener<any>, VoidFunction>();
  const listeners = new Set<Listener<T>>();
  const queue: { type: 'add' | 'delete'; listener: Listener<T> }[] = [];

  const getUnsubscribe = (listener: Listener<any>) => {
    let unsubscribe = unsubscribeMap.get(listener);
    if (!unsubscribe) {
      let active = true;
      unsubscribe = () => {
        if (!active) {
          return;
        }
        active = false;
        if (emitting) {
          queue.push({ type: 'delete', listener });
        } else {
          listeners.delete(listener);
        }
      };

      unsubscribeMap.set(listener, unsubscribe);
    }
    return unsubscribe;
  };

  return {
    size() {
      return listeners.size;
    },
    emit(args) {
      if (emitted && equal?.(last, args)) {
        return;
      }
      emitting = true;
      emitted = true;
      last = args;
      try {
        listeners.forEach(listener => listener(args));
      } finally {
        emitting = false;
        queue.splice(-queue.length).forEach(({ type, listener }) => {
          listeners[type](listener);
        });
      }
    },
    on(listener) {
      if (emitting) {
        queue.push({ type: 'add', listener });
      } else {
        listeners.add(listener);
      }

      return getUnsubscribe(listener);
    },
    emitted() {
      return emitted;
    },
    last() {
      return last;
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      onDispose?.();
    },
  };
};
