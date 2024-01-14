import { Listener, Listenable, Equal, OnceOptions } from './types';
import { NOOP } from './utils';

export type Emitter<T> = Listenable<T> & {
  size: () => number;
  emit: (args: T) => void;
  emitted: () => boolean;
  dispose: () => void;
  clear: () => void;
};

export type EmitterOptions<T> = {
  onDispose?: VoidFunction;
  equal?: Equal<T>;
  once?: boolean | OnceOptions;
};

export type EmitterFn = <T = void>(options?: EmitterOptions<T>) => Emitter<T>;

export const emitter: EmitterFn = ({
  onDispose,
  equal,
  once,
}: EmitterOptions<any> = {}) => {
  let emitting = false;
  let emitted: { args: any } | undefined;
  let disposed = false;
  const listeners = new Set<Listener>();
  const queue: { type: 'add' | 'delete'; listener: Listener }[] = [];

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
      if (emitted) {
        if (once) {
          if (typeof once === 'object' && once.recent) {
            listener(emitted.args);
          }

          return NOOP;
        }
      }

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
      return Boolean(emitted);
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
