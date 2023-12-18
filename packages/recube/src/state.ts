import { produce } from 'immer';
import {
  AnyFunc,
  ImmutableType,
  NoInfer,
  Listenable,
  StaleOptions,
  State,
  Listener,
} from './types';
import { objectKeyedMap } from './objectKeyedMap';
import { emitter } from './emitter';
import { asyncResult, isPromiseLike } from './async';
import { stateInterceptor } from './intercept';
import { STRICT_EQUAL } from './utils';
import { action as createAction } from './action';

export type StateInstance = {
  readonly value: any;
  readonly params: any;
  when: (
    listenable: Listenable,
    options: AnyFunc | StaleOptions<any, any>,
  ) => void;
  dispose: () => void;
};

export type StateOptions = {
  name?: string;
};

const DEFAULT_REDUCER = (_: any, result: any) => result;

const createState = <T, P = void>(
  init: T | ((params: P) => T),
  _: StateOptions = {},
) => {
  const instances = objectKeyedMap({
    create: (params: P) => {
      const instance = createInstance(init, params, equalFn);
      onCreate.emit(instance);
      return instance;
    },
    onRemove: x => x.dispose(),
  });
  const onCreate = emitter<StateInstance>();
  let equalFn = STRICT_EQUAL;

  let prevParams: P | undefined;
  let prevInstance: StateInstance | undefined;

  const applyAll = (callback: (instance: StateInstance) => void) => {
    onCreate.on(callback);
    instances.forEach(callback);
  };

  const definition: State<T, P> = Object.assign(
    (params: P) => {
      // improve performance by storing prev params and instance
      // using prev instance if the params and prev params is the same
      if (prevParams === params && prevInstance) {
        return prevInstance.value;
      }
      prevParams = params;
      prevInstance = instances.get(params);
      return prevInstance.value;
    },
    {
      type: 'state' as const,
      when(
        listenable: Listenable,
        options: StaleOptions<any, any> | AnyFunc = DEFAULT_REDUCER,
      ) {
        applyAll(({ when }) => when(listenable, options));
        return definition;
      },
      action(reducer: AnyFunc | Record<string, AnyFunc>): any {
        if (typeof reducer === 'function') {
          const action = createAction<any>();
          definition.when(action, reducer);
          return action;
        }

        const actions = {} as Record<string, AnyFunc>;
        Object.entries(reducer).forEach(([key, value]) => {
          const action = createAction<any>();
          definition.when(action, value);
          actions[key] = action;
        });
        return actions;
      },
      distinct(equal: AnyFunc) {
        equalFn = equal;
        return definition;
      },
      wipe(filter?: AnyFunc) {
        if (filter) {
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
    },
  );

  return definition;
};

const createInstance = <P>(init: any, params: P, equalFn: AnyFunc) => {
  let value: any;
  let staled = true;
  let unwatch: VoidFunction | undefined;
  // hold computation error
  let error: any;
  const onChange = emitter();
  const onDispose = emitter();

  const change = (nextValue: any) => {
    if (equalFn(value, nextValue)) {
      // nothing change
      return;
    }

    if (isPromiseLike(nextValue)) {
      value = asyncResult(nextValue);
    }
    value = nextValue;
    onChange.emit(value);
  };

  const computeValue = (forceRecompute?: boolean) => {
    if (forceRecompute) {
      staled = true;
    }

    if (!staled) {
      return;
    }
    staled = false;
    error = undefined;

    if (typeof init === 'function') {
      const [{ watch }, result] = stateInterceptor.apply(() => {
        try {
          return (init as AnyFunc)(params);
        } catch (ex) {
          error = ex;
          return undefined;
        }
      });
      // we keep watching even if an error occurs
      unwatch = watch(() => {
        staled = true;
        unwatch?.();

        if (onChange.size()) {
          computeValue(true);
        }
      });

      if (!error) {
        change(result);
      }
    } else {
      change(init);
    }
  };

  const instance: StateInstance = {
    params,
    get value() {
      computeValue();

      if (error) {
        throw error;
      }

      stateInterceptor.current?.addListenable(onChange);

      return value;
    },
    when(listenable, staleOptionsOrReducer) {
      let listener: Listener;

      if (typeof staleOptionsOrReducer === 'function') {
        computeValue();

        const reducer = staleOptionsOrReducer;
        listener = result => {
          try {
            const nextValue = reducer(value, result, { params });
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
          if (staleOptions.notify) {
            onChange.emit();
          }
        };
      }

      onDispose.on(listenable.on(listener));
    },
    dispose() {
      unwatch?.();
      onDispose.emit();
    },
  };

  return instance;
};

export const state = <T, P = void>(
  init: ((params: P) => T) | T,
  options?: StateOptions,
): State<T, P> => {
  const result: State<T, P> = createState(init, options);
  stateInterceptor.current?.addDisposable(result.wipe);
  return result;
};

export const mutate =
  <T, A extends any[]>(
    recipe: (
      value: NoInfer<T>,
      ...args: NoInfer<A>
    ) => NoInfer<T extends ImmutableType ? T : void | T>,
  ) =>
  (value: T | PromiseLike<T>, ...args: A): T => {
    const reducer = (resolved: any) =>
      produce(resolved, (draft: T) => recipe(draft, ...args));

    if (isPromiseLike(value)) {
      const ar = asyncResult(value);

      if (ar.error) {
        return ar as any;
      }

      if (ar.loading) {
        return ar.then(reducer) as any;
      }

      const next = reducer(ar.data);
      return asyncResult.resolve(next) as any;
    }

    return reducer(value) as any;
  };
