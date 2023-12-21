/* eslint-disable @typescript-eslint/unified-signatures */
import { EmitterOptions, emitter } from './emitter';
import { AnyFunc, Listenable } from './types';

export const once = <T>(listenable: Listenable<T>): Listenable<T> => {
  let emitted = false;
  return from(listenable, {
    transmitter(listener) {
      return args => {
        if (emitted) {
          return;
        }
        emitted = true;
        listener(args);
      };
    },
  });
};

export const recent = <T>(listenable: Listenable<T>): Listenable<T> => {
  let handleRecentLogic = false;

  return from(listenable, {
    transmitter(listener) {
      if (!handleRecentLogic) {
        handleRecentLogic = true;

        if (listenable.last) {
          const args = listenable.last();
          if (args !== null) {
            listener(args);
          }
        }
      }
      return listener;
    },
  });
};

export const any = <T>(...listenables: Listenable<T>[]): Listenable<T> => {
  const next = emitter<T>();
  listenables.forEach(x => x.on(next.emit));
  return next;
};

export type From = {
  <T = void>(
    listenable: Listenable<T>,
    options?: EmitterOptions<T>,
  ): Listenable<T>;

  <T = void>(
    emittable: (emit: (args: T) => void) => void,
    options?: EmitterOptions<T>,
  ): Listenable<T>;
};

export const from: From = (
  listenableOrEmittable: AnyFunc | Listenable,
  options?: EmitterOptions<any>,
) => {
  const e = emitter(options);
  if ('on' in listenableOrEmittable) {
    listenableOrEmittable.on(e.emit);
  } else {
    listenableOrEmittable(e.emit);
  }

  return e;
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
