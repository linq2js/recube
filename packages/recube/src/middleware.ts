/* eslint-disable no-nested-ternary */
import {
  ActionMiddleware,
  ActionMiddlewareContext,
  AnyAction,
  Listenable,
} from './types';

const DEBOUNCE_TIMEOUT_ID_PROP = Symbol('debounceTimeoutId');
const THROTTLE_LAST_EXECUTION_TIME_PROP = Symbol('throttleLastExecutionTime');

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

/**
 * dispatch action after specified milliseconds
 * @param ms
 * @returns
 */
export const debounce =
  (ms: number): ActionMiddleware =>
  ({ data }, dispatch) => {
    const debounceTimeoutId = data[DEBOUNCE_TIMEOUT_ID_PROP];
    clearTimeout(debounceTimeoutId);
    data[DEBOUNCE_TIMEOUT_ID_PROP] = setTimeout(dispatch, ms);
  };

export const throttle =
  (ms: number): ActionMiddleware =>
  ({ data }, dispatch) => {
    const next =
      ((data[THROTTLE_LAST_EXECUTION_TIME_PROP] as number) ?? 0) + ms;
    const now = performance.now();
    if (next <= now) {
      data[THROTTLE_LAST_EXECUTION_TIME_PROP] = now;
      dispatch();
    }
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

/**
 * apply specified middleware if `filter` return true
 * if no middleware specified, next dispatch function will be called
 * @param filter
 * @param middleware
 * @returns
 */
export const filter =
  <TPayload = any>(
    filter: (context: ActionMiddlewareContext<TPayload>) => boolean,
    middleware?: ActionMiddleware<TPayload>,
  ): ActionMiddleware<TPayload> =>
  (context, dispatch) => {
    if (filter(context)) {
      if (middleware) {
        middleware(context, dispatch);
      } else {
        dispatch();
      }
    }
  };
