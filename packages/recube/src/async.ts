import { stateInterceptor } from './intercept';
import { AnyFunc, AsyncResult, Awaitable, Loadable, State } from './types';

export type WaitResult<T, TLoadable extends boolean> = TLoadable extends true
  ? T extends PromiseLike<infer D>
    ? Loadable<D>
    : Loadable<T>
  : T extends PromiseLike<infer D>
  ? D
  : T;

export type Wait = {
  <TAwaitable extends Awaitable<true>>(awaitable: TAwaitable): PromiseLike<
    AwaitableData<TAwaitable, false, false>
  >;
  <TAwaitable extends Awaitable<true>, TResolved>(
    awaitable: TAwaitable,
    onResolve: (
      value: AwaitableData<TAwaitable, false, false>,
    ) => TResolved | PromiseLike<TResolved>,
  ): PromiseLike<TResolved>;

  <TAwaitable extends Awaitable<true>, TResolved, TFallback>(
    awaitable: TAwaitable,
    onResolve: (
      value: AwaitableData<TAwaitable, false, false>,
    ) => TResolved | PromiseLike<TResolved>,
    onReject: (error: unknown) => TFallback | PromiseLike<TFallback>,
  ): PromiseLike<TResolved | TFallback>;
};

export type AwaitableData<
  TAwaitable extends Awaitable<any>,
  TLoadable extends boolean,
  TRace extends boolean,
> = TAwaitable extends State<infer D>
  ? WaitResult<D, TLoadable>
  : TAwaitable extends AsyncResult<infer D>
  ? WaitResult<D, TLoadable>
  : TRace extends true
  ? {
      [key in keyof TAwaitable]?: TAwaitable[key] extends State<infer D, void>
        ? WaitResult<D, TLoadable>
        : TAwaitable[key] extends AsyncResult<infer D>
        ? WaitResult<D, TLoadable>
        : never;
    }
  : {
      [key in keyof TAwaitable]: TAwaitable[key] extends State<infer D, void>
        ? WaitResult<D, TLoadable>
        : TAwaitable[key] extends AsyncResult<infer D>
        ? WaitResult<D, TLoadable>
        : never;
    };

const ASYNC_RESULT_PROP = Symbol('asyncResult');

export const wait: Wait = (
  awaitable: any,
  onResolve?: AnyFunc,
  onReject?: AnyFunc,
) => {
  const interceptor = stateInterceptor.current;
  const wrap = <T extends AnyFunc>(fn: T) => {
    return (...args: Parameters<T>) => {
      const [, result] = stateInterceptor.apply(() => fn(...args), interceptor);
      return result;
    };
  };

  try {
    const result = waitAll(awaitable);
    // no need to wrap, it is still in current thread
    if (onResolve) {
      const resolved = onResolve(result);
      if (isPromiseLike(resolved)) {
        throw resolved;
      }
      return asyncResult.resolve(resolved);
    }
    return asyncResult.resolve(result);
  } catch (ex) {
    if (!isPromiseLike(ex)) {
      if (onReject) {
        const data = onReject(ex);
        return asyncResult.resolve(data);
      }
      return asyncResult.reject(ex);
    }

    if (!interceptor) {
      return ex.then(onResolve, onReject);
    }

    if (!onResolve) {
      return ex;
    }

    return asyncResult(ex.then(wrap(onResolve), onReject && wrap(onReject)));
  }
};

const nilLoadable = {} as Loadable<any>;

const createWait =
  <TLoadable extends boolean, TRace extends boolean>(
    useLoadable: TLoadable,
    race: TRace,
  ) =>
  <TAwaitable extends Awaitable<any>>(
    awaitable: TAwaitable,
  ): AwaitableData<TAwaitable, TLoadable, TRace> => {
    const isSingle = !awaitable || typeof awaitable === 'function';
    const collection = isSingle ? [awaitable] : awaitable;
    const allEntries = Object.entries(collection);
    const nonNullEntries = allEntries.filter(x => Boolean(x));
    const promises: AsyncResult<any>[] = [];
    const all: any = Array.isArray(collection) ? [] : {};
    let last: any;
    let resolvedCount = 0;

    const resolve = (result: AsyncResult) => {
      if (useLoadable) {
        if (result.loading) {
          // tell current context should listen async result change event
          stateInterceptor.current?.addListenable(result);
        }

        return result;
      }

      if (result.loading) {
        promises.push(result);
        return undefined;
      }

      if (result.error) {
        throw result.error;
      }

      resolvedCount++;

      return result.data;
    };

    nonNullEntries.forEach(([key, item]) => {
      let value: any;
      // is state
      if (typeof item === 'function') {
        value = item();
      } else {
        value = item;
      }
      const result = asyncResult(value);
      last = resolve(result);
      all[key] = last;
    });

    if (useLoadable) {
      allEntries.forEach(([key]) => {
        if (!all[key]) {
          all[key] = nilLoadable;
        }
      });
    } else if (promises.length) {
      if (race) {
        if (!resolvedCount) {
          throw Promise.race(promises).then(resolved =>
            isSingle ? resolved[0] : all,
          );
        }
      } else {
        throw Promise.all(promises).then(resolved =>
          isSingle ? resolved[0] : all,
        );
      }
    }

    return isSingle ? last : all;
  };

const waitNone = createWait(true, false);

const waitAll = createWait(false, false);

const waitAny = createWait(false, true);

export { waitNone, waitAll, waitAny };

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
  <T>(promise: Promise<T>): AsyncResult<T> => {
    if (!isPromiseLike(promise)) {
      return asyncResult.resolve(promise);
    }

    return asyncResultProps(promise, true, undefined, undefined);
  },
  {
    resolve(value: any) {
      if (isPromiseLike(value)) {
        return asyncResult(value);
      }
      return asyncResultProps(Promise.resolve(value), false, value, undefined);
    },
    reject(reason: any) {
      if (isPromiseLike(reason)) {
        return asyncResult(reason);
      }
      return asyncResultProps(Promise.reject(reason), false, undefined, reason);
    },
  },
);

export const isPromiseLike = <T>(value: any): value is Promise<T> => {
  return value && typeof value.then === 'function';
};

export const delay = (ms = 0) => {
  let timeoutId: any;
  return Object.assign(
    new Promise<void>(resolve => {
      timeoutId = setTimeout(resolve, ms);
    }),
    {
      cancel() {
        clearTimeout(timeoutId);
      },
    },
  );
};
