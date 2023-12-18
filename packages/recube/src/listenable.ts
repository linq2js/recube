import { Emitter, emitter } from './emitter';
import { Listenable, Subscribe } from './types';
import { NOOP } from './utils';

export const once = <T>(next: Emitter<T>): Subscribe<T> => {
  let emitted = false;

  return listener => {
    if (emitted) {
      return NOOP;
    }

    const unsubscribe = next.on(args => {
      emitted = true;
      unsubscribe();
      return listener(args);
    });

    return unsubscribe;
  };
};

export const recent = <T>(next: Emitter<T>): Subscribe<T> => {
  return listener => {
    const unsubscribe = next.on(listener);

    if (next.emitted()) {
      listener(next.last() as T);
    }

    return unsubscribe;
  };
};

export const any = <T>(...listenables: Listenable<T>[]) => {
  const centralized = emitter<T>();
  listenables.forEach(x => x.on(centralized.emit));
  return centralized;
};
