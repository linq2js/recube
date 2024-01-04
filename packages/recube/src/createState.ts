import {
  AnyFunc,
  Listenable,
  StaleOptions,
  Listener,
  MutableState,
  StateOptions,
  EO,
} from './types';
import { objectKeyedMap } from './objectKeyedMap';
import { emitter } from './emitter';
import { async, isPromiseLike } from './async';
import { trackable } from './trackable';
import { NOOP, STRICT_EQUAL } from './utils';
import { Cancellable, cancellable } from './cancellable';
import { disposable } from './disposable';
import { scope } from './scope';

export type StateInstance = {
  get: () => any;
  params: () => any;
  when: (
    listenable: Listenable,
    options: AnyFunc | StaleOptions<any, any>,
  ) => void;
  dispose: () => void;
  set: (valueOrReducer: any) => any;
  peek: () => any;
};

const DEFAULT_REDUCER = (_: any, result: any) => result;

export const createDef = <T, P, E extends Record<string, any> = EO>(
  init: T | ((params: P) => T),
  { equal = STRICT_EQUAL }: StateOptions<T> = {},
  enhancer?: (state: MutableState<T, P>) => E,
): E & MutableState<T, P> => {
  const instances = objectKeyedMap({
    create: (params: P) => {
      const instance = createInstance(init, params, equal);
      onCreate.emit(instance);
      return instance;
    },
    onRemove: x => x.dispose(),
  });
  const onCreate = emitter<StateInstance>();
  let mutable = true;

  let prevParams: P | undefined;
  let prevInstance: StateInstance | undefined;

  const applyAll = (callback: (instance: StateInstance) => void) => {
    onCreate.on(callback);
    instances.forEach(callback);
  };

  const definition: MutableState<T, P> = Object.assign(
    (params: P) => {
      // improve performance by storing prev params and instance
      // using prev instance if the params and prev params is the same
      if (prevParams === params && prevInstance) {
        return prevInstance.get();
      }
      prevParams = params;
      prevInstance = instances.get(params);
      return prevInstance.get();
    },
    {
      type: 'state' as const,
      when(
        listenable: Listenable,
        options: StaleOptions<any, any> | AnyFunc = DEFAULT_REDUCER,
      ): any {
        mutable = false;
        applyAll(({ when }) => when(listenable, options));
        return definition;
      },
      wipe(filter?: AnyFunc) {
        if (typeof filter === 'function') {
          instances.delete(filter);
        } else {
          instances.clear();
        }
      },
      size() {
        return instances.size;
      },
      forEach(callback: AnyFunc) {
        instances.forEach(x => callback(x.params));
      },
      set(valueOrReducer: any, params: any) {
        if (!mutable) {
          throw new Error('State is not mutable');
        }

        const instance = instances.get(params);
        instance.set(valueOrReducer);
      },
      peek(params: any) {
        const instance = instances.get(params);
        return instance.peek();
      },
    },
  );

  disposable()?.add(definition.wipe);

  return Object.assign(definition, enhancer?.(definition));
};

const createInstance = <P>(init: any, params: P, equalFn: AnyFunc) => {
  let value: any;
  let staled = true;
  let cleanup = NOOP;
  let disposed = false;
  // hold computation error
  let error: any;
  let currentCancellable: Cancellable | undefined;
  let changeToken = {};
  const onChange = emitter();
  const onDispose = emitter();
  const unsubscribes = new Map<Listenable, VoidFunction>();

  const change = (nextValue: any) => {
    staled = false;
    if (equalFn(value, nextValue)) {
      // nothing change
      return;
    }

    if (isPromiseLike(nextValue)) {
      value = async(nextValue);
    }

    value = nextValue;
    changeToken = {};
    onChange.emit(value);
  };

  const recompute = (forceRecompute?: boolean) => {
    if (forceRecompute) {
      staled = true;
    }

    if (!staled) {
      return;
    }

    currentCancellable?.cancel();
    currentCancellable = undefined;

    staled = false;
    error = undefined;

    if (typeof init === 'function') {
      cleanup?.();
      const [scopes, result] = scope(
        { cancellable, disposable, trackable },
        () => {
          try {
            return (init as AnyFunc)(params);
          } catch (ex) {
            error = ex;
            return undefined;
          }
        },
      );

      currentCancellable = scopes.cancellable;

      // we keep watching even if an error occurs
      const unwatch = scopes.trackable.track(() => {
        staled = true;
        cleanup?.();

        if (onChange.size()) {
          recompute(true);
        }
      });

      cleanup = () => {
        unwatch();
        scopes.disposable.dispose();
      };

      if (!error) {
        change(result);
      }
    } else {
      change(init);
    }
  };

  const getValue = (shouldTrack: boolean) => {
    recompute();

    if (error) {
      throw error;
    }

    if (shouldTrack) {
      trackable()?.add(onChange);
    }

    return value;
  };

  const instance: StateInstance = {
    params() {
      return params;
    },
    get() {
      return getValue(true);
    },
    when(listenable, staleOptionsOrReducer) {
      let listener: Listener;

      if (typeof staleOptionsOrReducer === 'function') {
        const reducer = staleOptionsOrReducer;
        listener = result => {
          // make sure latest value is present
          recompute();

          try {
            currentCancellable?.cancel();
            const [nextCancellable, nextValue] = cancellable(() =>
              reducer(value, result, {
                params,
                optimistic(value: any, valueOrLoader: any, rollback?: AnyFunc) {
                  const prevChangeToken = changeToken;
                  const prevCancellable = currentCancellable;
                  const prevValue = value;
                  const response =
                    typeof valueOrLoader === 'function'
                      ? valueOrLoader()
                      : valueOrLoader;

                  if (!isPromiseLike(response)) {
                    return response;
                  }

                  const ar = async(response);
                  if (ar.error) {
                    throw ar.error;
                  }

                  if (!ar.loading) {
                    return ar.data;
                  }

                  ar.then(
                    resolved => {
                      if (
                        prevChangeToken !== changeToken ||
                        prevCancellable?.cancelled()
                      ) {
                        return;
                      }
                      change(resolved);
                    },
                    error => {
                      if (
                        prevChangeToken !== changeToken ||
                        prevCancellable?.cancelled()
                      ) {
                        return;
                      }

                      const restoredValue = rollback
                        ? rollback(value, error)
                        : prevValue;

                      change(restoredValue);
                    },
                  );

                  return value;
                },
              }),
            );
            currentCancellable = nextCancellable;
            change(nextValue);
          } catch (ex) {
            error = ex;
            onChange.emit();
          }
        };
      }
      // stale options
      else {
        const staleOptions = staleOptionsOrReducer;
        listener = data => {
          if (
            typeof staleOptions.stale === 'function' &&
            !staleOptions.stale(value, data)
          ) {
            return;
          }
          // mark as staled
          staled = true;
          onChange.emit();
        };
      }

      unsubscribes.get(listenable)?.();
      unsubscribes.set(listenable, listenable.on(listener));
    },
    set(valueOrReducer) {
      let next: any;
      if (typeof valueOrReducer === 'function') {
        recompute();
        next = valueOrReducer(value);
      } else {
        next = valueOrReducer;
      }
      change(next);
    },
    peek() {
      return getValue(false);
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      cleanup();
      unsubscribes.forEach(x => x());
      onDispose.emit();
      unsubscribes.clear();
      onDispose.clear();
    },
  };

  return instance;
};
