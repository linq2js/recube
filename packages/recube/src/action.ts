import { emitter } from './emitter';
import { Action, ActionMiddlewareContext, AnyFunc, State } from './types';
import { asyncResult, isPromiseLike } from './async';
import { state } from './state';
import { NOOP } from './utils';
import { abortController } from './abortController';

export type ExtraActions<TPayload> = {
  /**
   * this action will be dispatched whenever the action body returns promise object
   */
  loading: Action<{ payload: TPayload }, void>;

  /**
   * this action will be dispatched whenerver the action body throws an error or returns rejected promise object
   */
  failed: Action<{ payload: TPayload; error: unknown }, void>;
};

export type CreateAction = {
  <TData = void>(): Action<TData, TData> & ExtraActions<TData>;
  <TData, TPayload = void>(body: (payload: TPayload) => TData): Action<
    TData,
    TPayload
  > &
    ExtraActions<TPayload>;
};

const DEFAULT_CALLING = () => false;

class ActionData {
  data: any;

  type: 'error' | 'result';

  constructor(data: ActionData['data'], type: ActionData['type']) {
    this.type = type;
    this.data = data;
  }
}

const create = (body?: AnyFunc, middleware: AnyFunc[] = []) => {
  const onDispatch = emitter<any>();
  let changeResultAction: Action<ActionData, any> | undefined;
  let loadingAction: Action<any, any> | undefined;
  let failedAction: Action<any, any> | undefined;
  let resultState: State<any, void> | undefined;
  // keep last result for late use with resultState
  let lastResult: any;

  const getResult = () => {
    if (!resultState) {
      changeResultAction = action<ActionData>();
      resultState = state(lastResult, { name: '#ACTION_RESULT' });
      resultState.when(changeResultAction, (_, result) => {
        if (result.type === 'error') {
          throw result.data;
        }
        return result.data;
      });
    }
    return resultState;
  };

  const context: ActionMiddlewareContext & { called: number } = {
    data: {},
    called: 0,
    calling: DEFAULT_CALLING,
    cancel: NOOP,
    onDone: [],
    payload: () => null as any,
    on: onDispatch.add,
  };

  const nextAction = () => {
    // call next action if any
    context.onDone.shift()?.();
  };

  const updateContext = (props: Partial<ActionMiddlewareContext>) => {
    Object.assign(context, props);
    Object.assign(a, props);
  };

  const dispatch = (...args: any[]): any => {
    const payload = args[0];
    const ac = abortController.current;
    ac?.throwIfAborted();
    let cancelled = false;
    let calling = true;
    context.called++;
    updateContext({
      calling: DEFAULT_CALLING,
      cancel() {
        cancelled = true;
      },
    });
    let result: any;
    let error: any;
    try {
      result = body ? body(payload) : payload;
    } catch (ex) {
      error = ex;
    }
    if (isPromiseLike(result)) {
      const originalPromise = result;
      const wrappedPromise = new Promise((resolve, reject) => {
        originalPromise
          .then(value => {
            calling = false;
            if (!cancelled && !ac?.aborted) {
              resolve(value);
              onDispatch.emit(value);
            }
          })
          .catch(reason => {
            calling = false;
            if (!cancelled && !ac?.aborted) {
              reject(reason);
            }
          });
      });

      updateContext({
        calling() {
          return calling;
        },
      });

      result = asyncResult(wrappedPromise);

      wrappedPromise.catch(error => {
        failedAction?.(error);
      });

      wrappedPromise.finally(nextAction);
      loadingAction?.({ payload });
    } else {
      try {
        onDispatch.emit(result);
      } finally {
        nextAction();
      }
    }
    lastResult = result;

    if (error) {
      changeResultAction?.(new ActionData(error, 'error'));
      failedAction?.({ payload, error });
      throw error;
    } else {
      changeResultAction?.(new ActionData(lastResult, 'result'));
    }

    return result;
  };

  const a = Object.assign(
    (...args: any[]) => {
      if (!middleware.length) {
        return dispatch(...args);
      }
      const payload = args[0];
      context.payload = () => payload;
      const wrappedDispatch = middleware.reduceRight(
        (next, wrapper) => {
          return () => {
            wrapper(context, next);
          };
        },
        () => {
          dispatch(...args);
        },
      );

      wrappedDispatch();
      return undefined;
    },
    {
      type: 'action' as const,
      result: undefined as any,
      loading: undefined as any,
      failed: undefined as any,
      on: onDispatch.add,
      called() {
        return Boolean(context.called) as any;
      },
      payload: NOOP,
      cancel: NOOP,
      calling: DEFAULT_CALLING,
      use(...newMiddleware: AnyFunc[]) {
        return create(body, newMiddleware.concat(newMiddleware));
      },
    },
  );

  Object.defineProperties(a, {
    result: { get: getResult },
    failed: {
      get() {
        if (!failedAction) {
          failedAction = create();
        }
        return failedAction;
      },
    },
    loading: {
      get() {
        if (!loadingAction) {
          loadingAction = create();
        }
        return loadingAction;
      },
    },
  });

  return a;
};

export const action: CreateAction = create;
