/* eslint-disable max-lines */
import { cancellable } from './cancellable';
import { scope } from './scope';
import { trackable } from './trackable';
import { AnyFunc, AsyncResult, Dictionary, Loadable } from './types';
import { NOOP, isObject } from './utils';

export type Awaitable<T = any> =
  | (() => T | PromiseLike<T>)
  | PromiseLike<T>
  | undefined;

export type AwaitableGroup<T = any> =
  | readonly Awaitable<T>[]
  | Dictionary<Awaitable<T>>;

export type RaceFn = <A extends AwaitableGroup | Exclude<Awaitable, undefined>>(
  awaitable: A,
) => AsyncResult<Partial<AwaitableData<A>>>;

export type AllFn = <A extends AwaitableGroup | Exclude<Awaitable, undefined>>(
  awaitable: A,
) => AsyncResult<AwaitableData<A>>;

export type WaitFn = <A extends AwaitableGroup | Exclude<Awaitable, undefined>>(
  awaitable: A,
) => AwaitableData<A>;

export type LoadableFn = <
  T extends AwaitableGroup | Exclude<Awaitable, undefined> | undefined,
>(
  awaitable: T,
) => LoadableFnResult<NonNullable<T>>;

export type LoadableFnResult<T> = T extends Awaitable<infer D>
  ? Loadable<D>
  : NonNullable<T> extends AwaitableGroup
  ? {
      [key in keyof T]: T[key] extends Awaitable<infer D>
        ? Loadable<D>
        : Loadable<T[key]>;
    }
  : never;

export type AwaitableData<T> = T extends Awaitable<infer D>
  ? D
  : T extends AwaitableGroup
  ? { [key in keyof T]: T[key] extends Awaitable<infer D> ? D : T[key] }
  : never;

type ResolvedData = {
  promise?: AsyncResult<any>;
  data?: any;
  error?: any;
  key: any;
};

const ASYNC_RESULT_PROP = Symbol('asyncResult');
const SCOPE_STACK_PROP = Symbol('scopeStack');

const resolveData = (key: any, value: any): ResolvedData => {
  if (isPromiseLike(value)) {
    const ar = async(value);
    if (ar.loading) {
      return { key, promise: ar };
    }
    return { key, data: ar.data, error: ar.error };
  }

  if (typeof value === 'function') {
    try {
      return resolveData(key, value());
    } catch (ex) {
      return { key, error: ex };
    }
  }

  return { key, data: value };
};

export const resolveAwaitable = (
  awaitable: any,
  resolveSingle: (item: ResolvedData) => any,
  resolveMultiple: (
    result: any,
    loading: (ResolvedData & { promise: AsyncResult<any> })[],
    resolved: ResolvedData[],
  ) => any,
) => {
  if (!awaitable) {
    throw new Error('Awaitable object must be not null or undefined');
  }

  if (isPromiseLike(awaitable) || typeof awaitable === 'function') {
    return resolveSingle(resolveData(null, awaitable));
  }

  const keys = Object.keys(awaitable);
  const result: any = Array.isArray(awaitable) ? [] : {};
  const loading: (ResolvedData & { promise: AsyncResult<any> })[] = [];
  const resolved: ResolvedData[] = [];

  keys.forEach(key => {
    const item = resolveData(key, awaitable[key]);
    if (item.promise) {
      loading.push(item as any);
    } else {
      resolved.push(item);
    }
  });

  return resolveMultiple(result, loading, resolved);
};

const resolveAsyncItem = (item: ResolvedData) => {
  if (item.promise) {
    return scoped(item.promise);
  }
  if (item.error) {
    return scoped(async.reject(item.error));
  }
  return scoped(async.resolve(item.data));
};

export const race: RaceFn = (awaitable: any) => {
  let done = false;
  return resolveAwaitable(
    awaitable,
    resolveAsyncItem,
    (result, loading, resolved) => {
      // handle first resolved item if any
      if (resolved.length) {
        const first = resolved[0];
        if (first.error) {
          return scoped(async.reject(first.error));
        }

        result[first.key] = first.data;
        return scoped(async.resolve(result));
      }

      const promises = loading.map(({ promise, key }) =>
        promise.then(value => {
          if (!done) {
            done = true;
            result[key] = value;
          }
        }),
      );

      return scoped(async(Promise.race(promises).then(() => result)));
    },
  );
};

export const all: AllFn = (awaitable: any) => {
  return resolveAwaitable(
    awaitable,
    resolveAsyncItem,
    (result, loading, resolved) => {
      for (const item of resolved) {
        // has any error
        if (item.error) {
          return scoped(async.reject(item.error));
        }
        result[item.key] = item.data;
      }

      const promises = loading.map(({ promise, key }) =>
        promise.then(value => {
          result[key] = value;
        }),
      );

      // not fulfilled
      if (promises.length) {
        return scoped(async(Promise.all(promises).then(() => result)));
      }

      // fulfilled
      return scoped(async.resolve(result));
    },
  );
};

export const wait: WaitFn = (awaitable: any) => {
  const resolveItem = (item: ResolvedData) => {
    if (item.promise) {
      throw item.promise;
    }

    if (item.error) {
      throw item.error;
    }

    return item.data;
  };

  return resolveAwaitable(
    awaitable,
    resolveItem,
    (result, loading, resolved) => {
      // should handle resolved items first, then loading items
      resolved.forEach(item => {
        result[item.key] = resolveItem(item);
      });

      loading.forEach(item => {
        result[item.key] = resolveItem(item);
      });

      return result;
    },
  );
};

export const loadable: LoadableFn = (awaitable: any) => {
  if (typeof awaitable === 'undefined' || awaitable === null) {
    return {};
  }

  const track = trackable()?.add;

  const resolveItem = (item: ResolvedData) => {
    if (item.promise) {
      track?.(item.promise);
      return item.promise;
    }

    return { error: item.error, data: item.data };
  };

  return resolveAwaitable(
    awaitable,
    resolveItem,
    (result, loading, resolved) => {
      loading.forEach(item => {
        result[item.key] = resolveItem(item);
      });

      resolved.forEach(item => {
        result[item.key] = resolveItem(item);
      });

      return result;
    },
  );
};

const asyncResultProps = <T = any>(
  promise: Promise<T>,
  initialLoading: boolean,
  initialData: any,
  initialError: any,
): AsyncResult<T> => {
  if (ASYNC_RESULT_PROP in promise) {
    return promise as unknown as AsyncResult<T>;
  }

  const ar = Object.assign(promise, {
    [ASYNC_RESULT_PROP]: true,
    loading: initialLoading,
    data: initialData,
    error: initialError,
    on(listener: VoidFunction) {
      let active = true;
      promise.finally(() => {
        if (!active) {
          return;
        }
        listener();
      });
      return () => {
        active = false;
      };
    },
  });

  if (ar.loading) {
    ar.then(
      result => {
        Object.assign(ar, { data: result, loading: false });
      },
      error => {
        Object.assign(ar, { error, loading: false });
      },
    );
  }

  return ar;
};

export const async = Object.assign(
  <T = any>(promise: Promise<T>): AsyncResult<T> => {
    if (!isPromiseLike(promise)) {
      return async.resolve(promise);
    }

    return asyncResultProps(promise, true, undefined, undefined);
  },
  {
    resolve<T = any>(value: Promise<T> | T): AsyncResult<T> {
      if (isPromiseLike(value)) {
        return async(value);
      }
      return asyncResultProps(Promise.resolve(value), false, value, undefined);
    },
    reject(reason: any) {
      if (isPromiseLike(reason)) {
        return async(reason);
      }
      return asyncResultProps(
        Promise.reject(reason).catch(NOOP),
        false,
        undefined,
        reason,
      );
    },
  },
);

export const isPromiseLike = <T>(value: any): value is Promise<T> => {
  return value && typeof value.then === 'function';
};

export const delay = (ms = 0) => {
  let timeoutId: any;
  const cc = cancellable();
  return Object.assign(
    new Promise<void>((resolve, reject) => {
      timeoutId = setTimeout(
        () => {
          const e = cc?.error();
          if (e) {
            reject(e);
          } else {
            resolve(e);
          }
        },
        ms,
        true,
      );
    }),
    {
      cancel() {
        clearTimeout(timeoutId);
      },
    },
  );
};

export const scoped = <T extends Promise<any>>(value: T): T => {
  const snapshot = scope();

  // same scope
  if ((value as any)[SCOPE_STACK_PROP] === snapshot) {
    return value;
  }

  const methods = {
    finally: value.finally?.bind(value),
    then: value.then?.bind(value),
    catch: value.catch?.bind(value),
  };
  const wrap = (fn?: AnyFunc) => {
    if (!fn) {
      return undefined;
    }
    return (...args: any[]) => {
      return scope(snapshot, () => fn(...args));
    };
  };
  return Object.assign(value, {
    [SCOPE_STACK_PROP]: snapshot,
    then(...args: any[]) {
      return scoped(methods.then(wrap(args[0]), wrap(args[1])));
    },
    catch: methods.catch
      ? (...args: any[]) => {
          return scoped(methods.catch(wrap(args[0])));
        }
      : undefined,
    finally: methods.finally
      ? (...args: any[]) => {
          return scoped(methods.finally(wrap(args[0])));
        }
      : undefined,
  });
};

export type MaybePromise<T> = PromiseLike<T> | T;

export type ChainResult<T> = T extends PromiseLike<any>
  ? T
  : T extends Record<string, any>
  ? {
      [key in keyof T]: Extract<T[key], MaybePromise<any>> extends MaybePromise<
        infer D
      >
        ? D
        : T[key];
    }
  : T;

export type ChainFunc<P, R> = (payload: ChainResult<P>) => R;

export type Chain = {
  <R1, R2>(initial: R1, f2: ChainFunc<R1, R2>): Promise<ChainResult<R2>>;

  <R1, R2, R3>(
    initial: R1,
    f2: ChainFunc<R1, R2>,
    f3: ChainFunc<R2, R3>,
  ): Promise<ChainResult<R3>>;

  <R1, R2, R3, R4>(
    initial: R1,
    f2: ChainFunc<R1, R2>,
    f3: ChainFunc<R2, R3>,
    f4: ChainFunc<R3, R4>,
  ): Promise<ChainResult<R4>>;

  <R1, R2, R3, R4, R5>(
    initial: R1,
    f2: ChainFunc<R1, R2>,
    f3: ChainFunc<R2, R3>,
    f4: ChainFunc<R3, R4>,
    f5: ChainFunc<R4, R5>,
  ): Promise<ChainResult<R5>>;

  <R1, R2, R3, R4, R5, R6>(
    initial: R1,
    f2: ChainFunc<R1, R2>,
    f3: ChainFunc<R2, R3>,
    f4: ChainFunc<R3, R4>,
    f5: ChainFunc<R4, R5>,
    f6: ChainFunc<R4, R6>,
  ): Promise<ChainResult<R6>>;

  <R1, R2, R3, R4, R5, R6, R7>(
    initial: R1,
    f2: ChainFunc<R1, R2>,
    f3: ChainFunc<R2, R3>,
    f4: ChainFunc<R3, R4>,
    f5: ChainFunc<R4, R5>,
    f6: ChainFunc<R4, R6>,
    f7: ChainFunc<R4, R7>,
  ): Promise<ChainResult<R7>>;

  <R1, R2, R3, R4, R5, R6, R7, R8>(
    initial: R1,
    f2: ChainFunc<R1, R2>,
    f3: ChainFunc<R2, R3>,
    f4: ChainFunc<R3, R4>,
    f5: ChainFunc<R4, R5>,
    f6: ChainFunc<R4, R6>,
    f7: ChainFunc<R4, R7>,
    f8: ChainFunc<R4, R8>,
  ): Promise<ChainResult<R8>>;
};

export const chain: Chain = (initial: any, ...funcs: AnyFunc[]) => {
  if (!funcs.length) {
    throw new Error('Chain requires at least one function');
  }

  const snapshot = scope();

  return Promise.resolve(
    [() => initial, ...funcs].reduceRight((next, func) => (payload: any) => {
      const result = scope(snapshot, () => func(payload));

      if (!isObject(result)) {
        return next(result);
      }

      if (isPromiseLike(result)) {
        return result.then(next);
      }

      const promises: Promise<any>[] = [];
      const nextPayload: Dictionary = {};

      Object.entries(result).forEach(([key, value]) => {
        if (isPromiseLike(value)) {
          const ar = async(value);
          if (ar.error) {
            throw ar.error;
          }

          if (!ar.loading) {
            nextPayload[key] = ar.data;
            return;
          }

          promises.push(value.then(resolved => (nextPayload[key] = resolved)));

          return;
        }

        nextPayload[key] = value;
      });

      if (promises.length) {
        return Promise.all(promises).then(() => next(nextPayload));
      }

      return next(nextPayload);
    })(initial),
  );
};
