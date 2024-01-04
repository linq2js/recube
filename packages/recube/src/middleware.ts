/* eslint-disable no-nested-ternary */
import {
  Accessor,
  ActionMiddleware,
  ActionMiddlewareContext,
  AnyAction,
  Listenable,
} from './types';

/**
 * dispatch action sequentially
 * @returns
 */
export const sequential =
  (): ActionMiddleware =>
  ({ calling, onDone }, dispatch) => {
    if (calling()) {
      onDone.push(dispatch);
    } else {
      dispatch();
    }
  };

/**
 * ignore current execution while previous execution is in progress
 * @returns
 */
export const droppable =
  (): ActionMiddleware =>
  ({ calling }, dispatch) => {
    if (!calling()) {
      dispatch();
    }
  };

/**
 *  keep latest execution only and cancel all previous executions
 * @returns
 */
export const restartable =
  (): ActionMiddleware =>
  ({ cancel }, dispatch) => {
    cancel();
    dispatch();
  };

export type ToggleOptions =
  | { on: AnyAction | AnyAction[]; off?: AnyAction | AnyAction[] | 'self' }
  | { off: AnyAction | AnyAction[] | 'self' };

export const toggle = (options: ToggleOptions): ActionMiddleware => {
  const createMiddleware = (
    initialState: 'on' | 'off',
    on: Listenable | Listenable[],
    off: Listenable | Listenable[] | 'self',
  ): ActionMiddleware => {
    let state = initialState;
    const initialized = false;

    return (context, dispatch) => {
      if (!initialized) {
        const toggleOn = () => (state = 'on');
        const toggleOff = () => (state = 'off');
        const onListenable = Array.isArray(on) ? on : [on];
        const offListenable =
          off === 'self'
            ? [{ on: context.on }]
            : Array.isArray(off)
            ? off
            : [off];

        onListenable.forEach(x => x.on(toggleOn));
        offListenable.forEach(x => x.on(toggleOff));
      }

      if (state === 'on') {
        dispatch();
      }
    };
  };

  // there is on option
  if ('on' in options) {
    // there is also off option
    if ('off' in options) {
      return createMiddleware('on', options.on, options.off ?? []);
    }

    // `on` only
    return createMiddleware('off', options.on, []);
  }

  // off only
  return createMiddleware('on', [], options.off);
};

export type MiddlewareOrListenable = {
  (context: ActionMiddlewareContext, dispatch: VoidFunction): void;
  <T>(listenable: Listenable<T>): Listenable<T>;
};

export const middlewareOrListenable = (
  listenableFactory: (
    data: Accessor,
    listenable: Listenable<any>,
  ) => Listenable<any>,
  middleware: (
    data: Accessor,
    ...args: Parameters<ActionMiddleware>
  ) => ReturnType<ActionMiddleware>,
): MiddlewareOrListenable => {
  const dataProp = Symbol('data');

  return (...args: any[]): any => {
    const context = args[0];
    const dataAccessor = (...args: any[]) => {
      if (args.length) {
        context[dataProp] = args[0];
        return undefined;
      } else {
        return context[dataProp];
      }
    };

    if (typeof args[1] === 'function') {
      return middleware(dataAccessor, args[0], args[1]);
    }
    return listenableFactory(dataAccessor, args[0]);
  };
};

/**
 * dispatch action after specified milliseconds
 * @param ms
 * @returns
 */
export const debounce = (ms: number) => {
  const internal = (data: Accessor, dispatch: VoidFunction) => {
    clearTimeout(data());
    data(setTimeout(dispatch, ms));
  };

  return middlewareOrListenable(
    (data, listenable) => ({
      on(listener) {
        return listenable.on(args => {
          internal(data, () => listener(args));
        });
      },
    }),
    (data, _context, dispatch) => internal(data, dispatch),
  );
};

export const throttle = (ms: number) => {
  const internal = (data: Accessor, dispatch: VoidFunction) => {
    const last: number = data() ?? 0;
    const next = last + ms;
    const now = performance.now();
    if (next <= now) {
      data(now);
      dispatch();
    }
  };

  return middlewareOrListenable(
    (data, listenable) => ({
      on(listener) {
        return listenable.on(args => {
          internal(data, () => listener(args));
        });
      },
    }),
    (data, _context, dispatch) => internal(data, dispatch),
  );
};
