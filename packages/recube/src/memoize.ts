import { disposable } from './disposable';
import { trackable } from './trackable';
import { Equal } from './types';
import { NOOP } from './utils';

export type MemoizeOptions = {
  size?: number;
  equal?: Equal;
  track?: boolean;
};

export const memoize = <R, A extends any[]>(
  fn: (...args: A) => R,
  { size, equal = Object.is, track: trackingEnabled }: MemoizeOptions = {},
) => {
  let calls: {
    args: A;
    result: R;
    unwatch?: VoidFunction;
  }[] = [];

  const wipe = (filter?: (result: R, ...args: A) => boolean) => {
    if (typeof filter === 'function') {
      const unwatchFns: VoidFunction[] = [];
      calls = calls.filter(x => {
        if (filter(x.result, ...x.args)) {
          unwatchFns.push(x.unwatch ?? NOOP);
          return true;
        }
        return false;
      });
      unwatchFns.forEach(x => x());
    } else {
      calls.forEach(x => x.unwatch?.());
      calls = [];
    }
  };

  disposable()?.add(() => wipe());

  return Object.assign(
    (...args: A): R => {
      const cached = calls.find(x => x.args.every((v, i) => equal(args[i], v)));
      if (cached) {
        return cached.result;
      }
      if (size && calls.length >= size) {
        calls.shift()?.unwatch?.();
      }

      if (trackingEnabled) {
        const [{ track }, result] = trackable(() => fn(...args));

        const unwatch = track(() => {
          const index = calls.indexOf(call);
          if (index !== -1) {
            calls.splice(index, 1)[0].unwatch?.();
          }
        });
        const call = { args, result, unwatch };
        calls.push(call);
        return result;
      }

      const result = fn(...args);
      const call = { args, result };
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
