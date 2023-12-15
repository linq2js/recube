import { useRef, useState } from 'react';
import { AnyFunc } from './types';
import { NOOP } from './utils';

export const stableCallbackMap = () => {
  const callbacks = new Map<string, { original: AnyFunc; wrapper: AnyFunc }>();
  return {
    clear() {
      callbacks.clear();
    },
    get(name: string, original: AnyFunc) {
      const existingItem = callbacks.get(name);
      if (existingItem) {
        existingItem.original = original;
        return existingItem.wrapper;
      }
      const newItem = { original, wrapper: NOOP };
      newItem.wrapper = (...args: any[]) => {
        return newItem.original(...args);
      };
      callbacks.set(name, newItem);
      return newItem.wrapper;
    },
  };
};

export const useStable = <T extends Record<string, AnyFunc>>(
  callbacks: T,
): T => {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  return useState(() => {
    const callbackMap = stableCallbackMap();
    return new Proxy(callbacksRef.current, {
      get(_, name) {
        if (
          typeof name !== 'string' ||
          typeof callbacksRef.current[name] !== 'function'
        ) {
          return undefined;
        }
        return callbackMap.get(name, (...args: any[]) =>
          callbacksRef.current[name]?.(...args),
        );
      },
    });
  })[0];
};
