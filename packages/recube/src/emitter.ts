import { Listener, Observable } from './types';

export type Emitter<T> = Observable<T> & {
  size: () => number;
  emit: (args: T) => void;
  emitted: () => boolean;
  lastArgs: () => T | undefined;
};

export const emitter = <T = void>(): Emitter<T> => {
  let emitting = false;
  let emitted = false;
  let lastArgs: any;
  const listeners = new Set<Listener<T>>();
  const queue: { type: 'add' | 'delete'; listener: Listener<T> }[] = [];

  return {
    size() {
      return listeners.size;
    },
    emit(args) {
      emitting = true;
      emitted = true;
      lastArgs = args;
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
      let active = true;
      return () => {
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
    },
    emitted() {
      return emitted;
    },
    lastArgs() {
      return lastArgs;
    },
  };
};
