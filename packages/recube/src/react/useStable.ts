import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { AnyFunc, NoInfer } from '../types';
import { NOOP } from '../utils';
import { disposableScope } from '../disposableScope';
import { stableCallbackMap } from './stable';

export type StableCallbacks<T extends Record<string, any>> = {
  [key in keyof T]: T[key] extends AnyFunc ? T[key] : () => T[key];
};

export type ComponentLifeCycles = 'onMount' | 'onUnmount' | 'onRender';

export type UseStable = {
  <T, C extends Record<string, any>>(
    callbacks: C,
    init: (callbacks: NoInfer<StableCallbacks<C>>) => T,
  ): Omit<T, ComponentLifeCycles>;

  /**
   * call init function once and return the init result
   */
  <T>(init: () => T): Omit<T, ComponentLifeCycles>;

  <C extends Record<string, any>>(callbacks: C): Omit<
    StableCallbacks<C>,
    ComponentLifeCycles
  >;
};

const createCallbackProxy = (
  callbacksRef: MutableRefObject<Record<string, AnyFunc>>,
) => {
  const callbackMap = stableCallbackMap();
  const getCallback = (name: string | number | symbol) => {
    if (typeof name !== 'string') {
      return undefined;
    }

    return callbackMap.get(name, (...args: any[]) => {
      const propValue = callbacksRef.current[name];
      if (typeof propValue === 'function') {
        return propValue(...args);
      }
      return propValue;
    });
  };
  const proxy = new Proxy(callbacksRef.current, {
    get(_, name) {
      return getCallback(name);
    },
    ownKeys(_) {
      return [...Reflect.ownKeys(callbacksRef.current)];
    },
    getOwnPropertyDescriptor(_, key) {
      return {
        value: getCallback(key),
        enumerable: true,
        configurable: true,
      };
    },
  });

  return proxy;
};

export const useStable: UseStable = (...args: any[]): any => {
  const inputRef = useRef(typeof args[0] === 'function' ? {} : args[0]);
  const disposeRef = useRef(NOOP);
  inputRef.current = typeof args[0] === 'function' ? {} : args[0];

  const [result] = useState(() => {
    if (typeof args[0] === 'function') {
      const init = args[0] as AnyFunc;
      const [{ dispose }, result] = disposableScope.wrap(init);
      disposeRef.current = dispose;
      return result;
    }

    if (typeof args[1] === 'function') {
      const proxy = createCallbackProxy(inputRef);
      const init = args[1] as AnyFunc;
      const [{ dispose }, result] = disposableScope.wrap(() => init(proxy));
      disposeRef.current = dispose;
      return result;
    }

    return createCallbackProxy(inputRef);
  });
  const { onRender } = result ?? {};
  useEffect(typeof onRender === 'function' ? onRender : NOOP);

  useEffect(() => {
    const { onMount, onUnmount } = result || {};
    let onUnmount2: VoidFunction | undefined;
    if (typeof onMount === 'function') {
      onUnmount2 = onMount();
    }

    return () => {
      disposeRef.current();

      if (typeof onUnmount === 'function') {
        onUnmount();
      }

      if (typeof onUnmount2 === 'function') {
        onUnmount2();
      }
    };
  }, [result]);

  return result;
};
