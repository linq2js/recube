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

export type UseStable = {
  <T extends Record<string, AnyFunc>>(callbacks: T): T;

  <T>(init: () => T): T;
};

export const useStable: UseStable = (
  input: Record<string, AnyFunc> | AnyFunc,
): any => {
  const inputRef = useRef(typeof input === 'function' ? {} : input);
  inputRef.current = typeof input === 'function' ? {} : input;

  return useState(() => {
    if (typeof input === 'function') {
      return input();
    }

    const callbackMap = stableCallbackMap();
    return new Proxy(inputRef.current, {
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
  })[0];
};
