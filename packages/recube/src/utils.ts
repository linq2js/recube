export const NOOP = () => {
  //
};

export const NOT_EQUAL = () => false;

export const STRICT_EQUAL = Object.is;

export type CurriedFunction<T extends any[], R> = T extends [
  infer A,
  ...infer B,
]
  ? (a: A) => CurriedFunction<B, R>
  : R;

export function curry<T extends any[], R>(
  func: (...args: T) => R,
): CurriedFunction<T, R> {
  return function curried(...args: any[]): any {
    if (args.length >= func.length) {
      return func(...(args as T));
    } else {
      return function (...args2: any) {
        return curried(...args.concat(args2));
      };
    }
  } as CurriedFunction<T, R>;
}

export const isObject = (value: any) => {
  return typeof value === 'object' && value;
};

export const enqueue = Promise.resolve().then.bind(Promise.resolve());

/**
 * perform shallowing comparison for 2 values
 * @param a
 * @param b
 * @returns
 */
export const shallow = (a: any, b: any) => {
  if (a === b) {
    return true;
  }
  if (!isObject(a) || !isObject(b)) {
    return false;
  }

  const keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b))));

  return keys.every(key => a[key] === b[key]);
};

export { equal } from '@wry/equality';
