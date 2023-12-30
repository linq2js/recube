import { cancellable } from './cancellable';
import { scoped } from './scope';
import { trackable } from './trackable';
import { AsyncResult, Dictionary, Loadable } from './types';
import { NOOP } from './utils';

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
  T extends AwaitableGroup | Exclude<Awaitable, undefined>,
>(
  awaitable: T,
) => T extends Awaitable<infer D>
  ? Loadable<D>
  : T extends AwaitableGroup
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

const resolveData = (key: any, value: any): ResolvedData => {
  if (isPromiseLike(value)) {
    const ar = asyncResult(value);
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
    return scoped(asyncResult.reject(item.error));
  }
  return scoped(asyncResult.resolve(item.data));
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
          return scoped(asyncResult.reject(first.error));
        }

        result[first.key] = first.data;
        return scoped(asyncResult.resolve(result));
      }

      const promises = loading.map(({ promise, key }) =>
        promise.then(value => {
          if (!done) {
            done = true;
            result[key] = value;
          }
        }),
      );

      return scoped(asyncResult(Promise.race(promises).then(() => result)));
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
          return scoped(asyncResult.reject(item.error));
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
        return scoped(asyncResult(Promise.all(promises).then(() => result)));
      }

      // fulfilled
      return scoped(asyncResult.resolve(result));
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

export const asyncResult = Object.assign(
  <T = any>(promise: Promise<T>): AsyncResult<T> => {
    if (!isPromiseLike(promise)) {
      return asyncResult.resolve(promise);
    }

    return asyncResultProps(promise, true, undefined, undefined);
  },
  {
    resolve<T = any>(value: Promise<T> | T): AsyncResult<T> {
      if (isPromiseLike(value)) {
        return asyncResult(value);
      }
      return asyncResultProps(Promise.resolve(value), false, value, undefined);
    },
    reject(reason: any) {
      if (isPromiseLike(reason)) {
        return asyncResult(reason);
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
