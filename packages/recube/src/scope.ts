export const scope = <T extends object>(create: () => T) => {
  const stack: T[] = [];

  const getCurrent = (): Omit<T, 'onExit' | 'onEnter'> | undefined => {
    return stack[0];
  };

  return {
    wrap<R>(fn: () => R, customScope?: T) {
      const current = customScope ?? create();
      const { onEnter, onExit } = (current as any) ?? {};
      stack.unshift(current);
      try {
        if (typeof onEnter === 'function') {
          onEnter();
        }
        return [current, fn()] as const;
      } finally {
        stack.shift();
        if (typeof onExit === 'function') {
          onExit();
        }
      }
    },
    current() {
      return getCurrent();
    },
  };
};
