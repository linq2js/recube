import { emitter } from './emitter';
import { Listenable } from './types';

export const once = <T>(listenable: Listenable<T>): Listenable<T> => {
  let emitted = false;
  return emitter.from(listenable, {
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

  return emitter.from(listenable, {
    transmitter(listener) {
      if (!handleRecentLogic) {
        handleRecentLogic = true;
        const all = listenable.all?.();
        if (all?.length) {
          listener(all[all.length - 1]);
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
