import { EmitterOptions, emitter } from './emitter';
import { Listenable, Listener } from './types';
import { NOOP } from './utils';

export const once = <T>(listenable: Listenable<T>): Listenable<T> => {
  let emitted = false;

  return {
    on(listener: Listener<T>) {
      if (emitted) {
        return NOOP;
      }

      return listenable.on(args => {
        if (emitted) {
          return;
        }
        emitted = true;
        listener(args);
      });
    },
  };
};

export const any = <T>(...listenables: Listenable<T>[]): Listenable<T> => {
  return {
    on(listener: Listener<T>) {
      const e = emitter();
      listenables.forEach(x => e.on(x.on(listener)));

      return () => {
        e.emit();
        e.clear();
      };
    },
  };
};

export const interval = (
  ms: number,
  options?: EmitterOptions<number>,
): Listenable<number> => {
  let intervalId: any;
  const e = emitter({
    ...options,
    onDispose() {
      options?.onDispose?.();
      clearInterval(intervalId);
    },
  });
  intervalId = setInterval(e.emit, ms);
  return e;
};
