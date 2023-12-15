import { AnyFunc } from './types';

export const swallowError = (pattern?: RegExp) => {
  let consoleError: AnyFunc;

  beforeEach(() => {
    consoleError = console.error;
    console.error = (...args: any[]) => {
      // swallow all errors
      if (!pattern) {
        return;
      }
      const text = String(args);
      if (text.match(pattern)) {
        return;
      }
      consoleError.apply(console, args);
    };
  });

  afterEach(() => {
    if (console.error === consoleError) {
      console.error = consoleError;
    }
  });
};
