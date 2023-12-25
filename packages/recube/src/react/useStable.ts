import { useEffect, useRef, useState } from 'react';
import { AnyFunc } from '../types';
import { stableCallbackMap } from '../stable';
import { NOOP } from '..';
import { disposableScope } from '@/disposableScope';

export type UseStable = {
  <T extends Record<string, AnyFunc>>(callbacks: T): T;

  <T>(init: () => T): T;
};

export const useStable: UseStable = (
  input: Record<string, AnyFunc> | AnyFunc,
): any => {
  const inputRef = useRef(typeof input === 'function' ? {} : input);
  const disposeRef = useRef(NOOP);
  inputRef.current = typeof input === 'function' ? {} : input;

  const [result] = useState(() => {
    if (typeof input === 'function') {
      const [{ dispose }, result] = disposableScope.wrap(input);
      disposeRef.current = dispose;
      return result;
    }

    const callbackMap = stableCallbackMap();
    const proxy = new Proxy(inputRef.current, {
      get(_, name) {
        if (
          typeof name !== 'string' ||
          typeof inputRef.current[name] !== 'function'
        ) {
          return undefined;
        }
        return callbackMap.get(name, (...args: any[]) =>
          inputRef.current[name]?.(...args),
        );
      },
    });

    return proxy;
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
