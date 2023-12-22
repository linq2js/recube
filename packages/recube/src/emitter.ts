import { Listener, Listenable, Equal } from './types';
import { NOOP } from './utils';

export type Emitter<T> = Listenable<T> & {
  size: () => number;
  emit: (args: T) => void;
  emitted: () => boolean;
  last: () => T | undefined;
  dispose: () => void;
  clear: () => void;
};

export type EmitterOptions<T> = {
  onDispose?: VoidFunction;
  equal?: Equal<T>;
  transmitter?: (listener: Listener<T>) => Listener<T> | undefined;
};

export type CreateEmitter = <T = void>(
  options?: EmitterOptions<T>,
) => Emitter<T>;

export const emitter: CreateEmitter = ({
  onDispose,
  transmitter,
  equal,
}: EmitterOptions<any> = {}) => {
  let emitting = false;
  let emitted: { args: any } | undefined;
  let disposed = false;
  const unsubscribeMap = new WeakMap<Listener<any>, VoidFunction>();
  const listeners = new Set<Listener>();
  const queue: { type: 'add' | 'delete'; listener: Listener }[] = [];

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
  const e: Emitter<any> = {
    size() {
      return listeners.size;
    },
    emit(args) {
      if (emitted && equal?.(emitted.args, args)) {
        return;
      }
      emitting = true;
      emitted = { args };
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
      const wrapper = transmitter ? transmitter(listener) : listener;
      if (!wrapper) {
        return NOOP;
      }

      if (emitting) {
        queue.push({ type: 'add', listener: wrapper });
      } else {
        listeners.add(wrapper);
      }

      return getUnsubscribe(wrapper);
    },
    emitted() {
      return Boolean(emitted);
    },
    last() {
      return emitted ? emitted.args : null;
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      onDispose?.();
    },
    clear() {
      listeners.clear();
      queue.length = 0;
    },
  };

  return e;
};
