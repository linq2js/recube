import { trackable } from './trackable';
import { Equal } from './types';
import { NOOP } from './utils';

export type MemoizeOptions = {
  size?: number;
  equal?: Equal;
};

export const memoize = <R, A extends any[]>(
  fn: (...args: A) => R,
  { size, equal = Object.is }: MemoizeOptions = {},
) => {
  let calls: {
    args: A;
    result: R;
    unwatch?: VoidFunction;
  }[] = [];

  const wipe = (filter?: (result: R, ...args: A) => boolean) => {
    if (typeof filter === 'function') {
      const unwatches: VoidFunction[] = [];
      calls = calls.filter(x => {
        if (filter(x.result, ...x.args)) {
          unwatches.push(x.unwatch ?? NOOP);
          return true;
        }
        return false;
      });
      unwatches.forEach(x => x());
    } else {
      calls.forEach(x => x.unwatch?.());
      calls = [];
    }
  };

  return Object.assign(
    (...args: A): R => {
      const cached = calls.find(x => x.args.every((v, i) => equal(args[i], v)));
      if (cached) {
        return cached.result;
      }
      const [{ track: watch }, result] = trackable(() => fn(...args));
      if (size && calls.length >= size) {
        calls.shift()?.unwatch?.();
      }
      const unwatch = watch(() => {
        const index = calls.indexOf(call);
        if (index !== -1) {
          calls.splice(index, 1)[0].unwatch?.();
        }
      });
      const call = { args, result, unwatch };
      calls.push(call);
      return result;
    },
    {
      size() {
        return calls.length;
      },
      wipe,
    },
  );
};
