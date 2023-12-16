import { Emitter } from './emitter';
import { Subscribe } from './types';
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
      listener(next.lastArgs() as T);
    }

    return unsubscribe;
  };
};
