import { Listenable, Equal, OnceOptions, AnyFunc } from './types';
import { NOOP } from './utils';

export type Emitter<T> = Listenable<T> & {
  size: () => number;
  emit: (args: T) => void;
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
  let emitted: { args: any } | undefined;
  let disposed = false;
  let emitting = false;
  let uniqueId = 0;
  const listeners = new Map<number, AnyFunc>();
  let isNew = new WeakSet<AnyFunc>();

  const clear = () => {
    listeners.clear();
    isNew = new WeakSet();
  };

  const e: Emitter<any> = {
    size() {
      return listeners.size;
    },
    emit(args) {
      if (emitted) {
        if (once || equal?.(emitted.args, args)) {
          return;
        }
      }
      emitted = { args };

      if (listeners.size) {
        try {
          emitting = true;
          listeners.forEach(listener => {
            if (isNew.has(listener)) {
              isNew.delete(listener);
            } else {
              listener(args);
            }
          });
        } finally {
          emitting = false;
        }
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

      const key = uniqueId++;
      listeners.set(key, listener);

      if (emitting) {
        isNew.add(listener);
      }

      let active = true;

      return () => {
        if (!active) {
          return;
        }
        active = false;
        listeners.delete(key);
        isNew.delete(listener);
      };
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      onDispose?.();
      clear();
    },
    clear,
  };

  return e;
};
