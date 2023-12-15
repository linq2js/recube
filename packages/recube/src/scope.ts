export const scope = <T extends object>(create: () => T) => {
  const stack: T[] = [];

  const getCurrent = (): T | undefined => {
    return stack[0];
  };

  return {
    apply<R>(fn: () => R, customScope?: T) {
      const current = customScope ?? create();
      stack.unshift(current);
      try {
        return [current, fn()] as const;
      } finally {
        stack.shift();
      }
    },
    get current() {
      return getCurrent();
    },
  };
};
