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
  let uniqueKey = 0;
  const IS_NEW_PROP = Symbol('isNew');
  const listeners = new Map<any, AnyFunc & { [IS_NEW_PROP]?: boolean }>();

  const clear = () => {
    listeners.clear();
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
            if (listener[IS_NEW_PROP]) {
              delete listener[IS_NEW_PROP];
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

      const key = uniqueKey++;
      if (emitting) {
        (listener as any)[IS_NEW_PROP] = true;
      }

      listeners.set(key, listener);

      let active = true;

      return () => {
        if (!active) {
          return;
        }
        active = false;
        listeners.delete(key);
      };
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      onDispose?.();
    },
    clear,
  };

  return e;
};
