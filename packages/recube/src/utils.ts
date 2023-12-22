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
