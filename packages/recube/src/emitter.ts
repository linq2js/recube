import { Listener, NoInfer, Listenable } from './types';
import { NOOP } from './utils';

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
  transmitter?: (listener: Listener<T>) => Listener<T> | undefined;
};

/**
 * this prop contains emitter object
 */
const EMITTER_PROP = Symbol('emitter');

export const emitter = Object.assign(
  <T = void>({
    onDispose,
    transmitter,
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
    const e: Emitter<T> = {
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

    Object.assign(e, { [EMITTER_PROP]: e });

    return e;
  },
  {
    from<T>(listenable: Listenable<T>, options?: EmitterOptions<T>) {
      const e = emitter<T>(options);
      listenable.on(e.emit);
      Object.assign(e, { all: listenable.all });
      return e;
    },
  },
);
