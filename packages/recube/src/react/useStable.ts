import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { AnyFunc, NoInfer } from '../types';
import { stableCallbackMap } from '../stable';
import { NOOP } from '..';
import { disposableScope } from '@/disposableScope';

export type UseStable = {
  <C extends Record<string, AnyFunc>>(callbacks: C): C;
  <T, C extends Record<string, AnyFunc>>(
    callbacks: C,
    init: (callbacks: NoInfer<C>) => T,
  ): T;

  <T>(init: () => T): T;
};

const createCallbackProxy = (
  callbacksRef: MutableRefObject<Record<string, AnyFunc>>,
) => {
  const callbackMap = stableCallbackMap();
  const getCallback = (name: string | number | symbol) => {
    if (
      typeof name !== 'string' ||
      typeof callbacksRef.current[name] !== 'function'
    ) {
      return undefined;
    }
    return callbackMap.get(name, (...args: any[]) =>
      callbacksRef.current[name]?.(...args),
    );
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

  useEffect(() => {
    const { mount, unmount } = result || {};
    let unmount2: VoidFunction | undefined;
    if (typeof mount === 'function') {
      unmount2 = mount();
    }

    return () => {
      disposeRef.current();

      if (typeof unmount === 'function') {
        unmount();
      }

      if (typeof unmount2 === 'function') {
        unmount2();
      }
    };
  }, [result]);

  return result;
};
