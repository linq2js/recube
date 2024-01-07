import { produce } from 'immer';
import { NoInfer } from './types';
import { async } from './async';
import { isObject, isPromiseLike } from './utils';

export type PropsOf<T> = T extends Promise<infer D> ? keyof D : keyof T;
export type PropValueOf<T, P> = T extends PromiseLike<infer D>
  ? P extends keyof D
    ? D[P]
    : never
  : P extends keyof T
  ? T[P]
  : never;

export type Alter = {
  /**
   * alter single prop with return value of specified reducer
   */
  <T extends Record<string, any>, P extends PropsOf<T>, A extends any[]>(
    prop: P,
    reducer: (
      prev: NoInfer<PropValueOf<T, P>>,
      ...args: NoInfer<A>
    ) => NoInfer<
      PropValueOf<T, P> extends PromiseLike<infer D>
        ? D | Promise<D>
        : PropValueOf<T, P> | Promise<PropValueOf<T, P>>
    >,
  ): (prev: T, ...args: A) => T;

  /**
   * alter obj/single value
   */
  <T, A extends any[]>(
    recipe: (value: NoInfer<T>, ...args: NoInfer<A>) => T | void,
  ): (value: T | PromiseLike<T>, ...args: A) => T;

  <T extends Record<string | symbol | number, any>, A extends any[]>(
    recipes: ((value: NoInfer<T>, ...args: NoInfer<A>) => T | void)[],
  ): (value: T | PromiseLike<T>, ...args: A) => T;
};

export const alter: Alter = (...args: any[]) => {
  if (args.length > 1) {
    return alterProp(args[0], args[1]);
  }
  if (Array.isArray(args[0])) {
    const recipes = args[0];
    return alterValue((prev: any, ...args: any[]) => {
      recipes.forEach(recipe => {
        recipe(prev, ...args);
      });
    });
  }
  return alterValue(args[0]);
};

const alterProp =
  <T extends Record<string, any>, P extends PropsOf<T>, A extends any[]>(
    prop: P,
    reducer: (
      prev: NoInfer<PropValueOf<T, P>>,
      ...args: NoInfer<A>
    ) => NoInfer<
      PropValueOf<T, P> extends PromiseLike<infer D>
        ? D | Promise<D>
        : PropValueOf<T, P> | Promise<PropValueOf<T, P>>
    >,
  ): ((prev: T, ...args: A) => T) =>
  (prev, ...args) => {
    const reducerWrapper = (prev: any) => {
      const prevPropValue = prev?.[prop];
      const nextPropValue = reducer(prevPropValue, ...args);
      if (prevPropValue === nextPropValue) {
        return prev;
      }
      return {
        ...prev,
        [prop]: nextPropValue,
      };
    };

    if (isPromiseLike(prev)) {
      return prev.then(reducerWrapper);
    }

    return reducerWrapper(prev);
  };

export const withResult = <T>(_: any, data: T): T => {
  return data;
};

const alterValue =
  <T, A extends any[]>(
    recipe: (value: NoInfer<T>, ...args: NoInfer<A>) => void,
  ) =>
  (value: T | PromiseLike<T>, ...args: A): T => {
    const reducerWrapper = (resolved: any) => {
      const isObj = isObject(resolved);
      return produce(resolved, (draft: T) => {
        const next = recipe(draft, ...args);
        if (isObj) {
          return undefined;
        }

        return next;
      });
    };

    if (isPromiseLike(value)) {
      const ar = async(value);

      if (ar.error) {
        return ar as any;
      }

      if (ar.loading) {
        return ar.then(reducerWrapper) as any;
      }

      const next = reducerWrapper(ar.data);
      return async.resolve(next) as any;
    }

    return reducerWrapper(value) as any;
  };
