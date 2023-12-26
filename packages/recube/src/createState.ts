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
import { asyncResult, isPromiseLike } from './async';
import { changeWatcher } from './changeWatcher';
import { STRICT_EQUAL } from './utils';
import { Canceler, canceler } from './canceler';
import { disposableScope } from './disposableScope';

export type StateInstance = {
  readonly value: any;
  readonly params: any;
  when: (
    listenable: Listenable,
    options: AnyFunc | StaleOptions<any, any>,
  ) => void;
  dispose: () => void;
  set: (valueOrReducer: any) => any;
};

const DEFAULT_REDUCER = (_: any, result: any) => result;

export const createState = <T, P, E extends Record<string, any> = EO>(
  init: T | ((params: P) => T),
  { equal = STRICT_EQUAL }: StateOptions<T> = {},
  enhancer?: (state: MutableState<T, P>) => E,
): E & MutableState<T, P> => {
  const instances = objectKeyedMap({
    create: (params: P) => {
      const instance = createStateInstance(init, params, equal);
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
    },
  );

  disposableScope.current()?.onDispose(definition.wipe);

  return Object.assign(definition, enhancer?.(definition));
};

const createStateInstance = <P>(init: any, params: P, equalFn: AnyFunc) => {
  let value: any;
  let staled = true;
  let cleanup: VoidFunction | undefined;
  // hold computation error
  let error: any;
  let cc: Canceler | undefined;
  const onChange = emitter();
  const onDispose = emitter();

  const change = (nextValue: any) => {
    staled = false;
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

  const recompute = (forceRecompute?: boolean) => {
    if (forceRecompute) {
      staled = true;
    }

    if (!staled) {
      return;
    }

    cc?.cancel();
    cc = undefined;

    staled = false;
    error = undefined;

    if (typeof init === 'function') {
      cc = canceler.new();
      cleanup?.();
      let disposeInner: VoidFunction | undefined;
      const [{ watch }, result] = changeWatcher.wrap(() => {
        const [{ dispose }, result] = disposableScope.wrap(() =>
          cc?.wrap(() => {
            try {
              return (init as AnyFunc)(params);
            } catch (ex) {
              error = ex;
              return undefined;
            }
          }),
        );
        disposeInner = dispose;
        return result;
      });
      // we keep watching even if an error occurs
      const unwatch = watch(() => {
        staled = true;
        cleanup?.();

        if (onChange.size()) {
          recompute(true);
        }
      });

      cleanup = () => {
        unwatch();
        disposeInner?.();
      };

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
      recompute();

      if (error) {
        throw error;
      }

      changeWatcher.current()?.addListenable(onChange);

      return value;
    },
    when(listenable, staleOptionsOrReducer) {
      let listener: Listener;

      if (typeof staleOptionsOrReducer === 'function') {
        const reducer = staleOptionsOrReducer;
        listener = result => {
          recompute();

          try {
            cc?.cancel();
            cc = canceler.new();
            const nextValue = cc.wrap(() => reducer(value, result, { params }));
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
    dispose() {
      cleanup?.();
      onDispose.emit();
    },
  };

  return instance;
};
