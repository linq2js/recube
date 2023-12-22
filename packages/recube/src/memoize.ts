import { Equal } from './types';

export type MemoizeOptions = {
  size?: number;
  equal?: Equal;
};

export const memoize = <R, A extends any[]>(
  fn: (...args: A) => R,
  { size, equal = Object.is }: MemoizeOptions = {},
) => {
  let calls: { args: A; result: R }[] = [];

  return Object.assign(
    (...args: A): R => {
      const cached = calls.find(x => x.args.every((v, i) => equal(args[i], v)));
      if (cached) {
        return cached.result;
      }
      const result = fn(...args);
      if (size && calls.length >= size) {
        calls.shift();
      }
      calls.push({ args, result });
      return result;
    },
    {
      size() {
        return calls.length;
      },
      wipe(filter?: (result: R, ...args: A) => boolean) {
        if (filter) {
          calls = calls.filter(x => filter(x.result, ...x.args));
        } else {
          calls = [];
        }
      },
    },
  );
};
