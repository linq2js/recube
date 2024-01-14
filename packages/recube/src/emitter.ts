import { Listener, Listenable, Equal, OnceOptions } from './types';
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
  const listeners: Listener[] = [];

  const clear = () => {
    listeners.length = 0;
  };

  const e: Emitter<any> = {
    size() {
      return listeners.length;
    },
    emit(args) {
      if (emitted) {
        if (once || equal?.(emitted.args, args)) {
          return;
        }
      }
      emitted = { args };

      if (listeners.length) {
        for (const listener of listeners.slice(0)) {
          listener(args);
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
      listeners[listeners.length] = listener;

      let active = true;

      return () => {
        if (!active) {
          return;
        }
        active = false;
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
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
