import { emitter } from './emitter';
import { Action, ActionMiddlewareContext, AnyFunc, State } from './types';
import { asyncResult, isPromiseLike } from './async';
import { NOOP } from './utils';
import { canceler } from './canceler';
import { lazyValue } from './lazyValue';
import { disposableScope } from './disposableScope';
import { createState } from './createState';
import { batch } from './batchScope';

const DEFAULT_CALLING = () => false;

class ActionData {
  data: any;

  type: 'error' | 'result';

  constructor(data: ActionData['data'], type: ActionData['type']) {
    this.type = type;
    this.data = data;
  }
}

export const createAction = (body?: AnyFunc, middleware: AnyFunc[] = []) => {
  const onDispatch = emitter<any>();
  const changeResultAction = lazyValue(
    () => createAction() as Action<ActionData, ActionData>,
  );
  const onDispose = emitter();
  const loadingAction = lazyValue(() => createAction() as Action<any, any>);
  const failedAction = lazyValue(
    () => createAction(createState) as Action<any, any>,
  );
  const resultState = lazyValue<State<any, void>>(() => {
    const [{ dispose }, result] = disposableScope.wrap(() =>
      createState<any, void>(callInfo.result, { name: '#ACTION_RESULT' }).when(
        changeResultAction.get(),
        (_, result) => {
          if (result.type === 'error') {
            throw result.data;
          }
          return result.data;
        },
      ),
    );
    onDispose.on(dispose);
    return result;
  });
  let equalFn: AnyFunc | undefined;
  // keep last result for late use with resultState
  const callInfo = {
    /**
     * last payload
     */
    payload: null as any,
    /**
     * last result
     */
    result: undefined as any,
    /**
     * number of body dispatching
     */
    count: 0,
    /**
     * indicate whether wrapper is dispatched or not
     */
    dispatched: false,
    once: false,
  };

  const context: ActionMiddlewareContext = {
    data: {},
    called() {
      return callInfo.count;
    },
    calling: DEFAULT_CALLING,
    cancel: NOOP,
    onDone: [],
    on: onDispatch.on,
  };

  const nextAction = () => {
    // call next action if any
    context.onDone.shift()?.();
  };

  const updateContext = (props: Partial<ActionMiddlewareContext>) => {
    Object.assign(context, props);
    Object.assign(instance, props);
  };

  const dispatch = (...args: any[]): any => {
    const payload = args[0];
    const ac = canceler.current();
    ac?.throwIfCancelled();
    let cancelled = false;
    let calling = true;
    callInfo.payload = payload;
    callInfo.count++;
    updateContext({
      calling: DEFAULT_CALLING,
      cancel() {
        cancelled = true;
      },
    });
    let result: any;
    let error: any;
    try {
      result = body ? batch(() => body(payload)) : payload;
    } catch (ex) {
      error = ex;
    }
    if (isPromiseLike(result)) {
      const originalPromise = result;
      const wrappedPromise = new Promise((resolve, reject) => {
        originalPromise
          .then(value => {
            calling = false;
            if (!cancelled && !ac?.cancelled) {
              resolve(value);
              onDispatch.emit(value);
            }
          })
          .catch(reason => {
            calling = false;
            if (!cancelled && !ac?.cancelled) {
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
        failedAction.peek()?.(error);
      });

      wrappedPromise.finally(nextAction);
      loadingAction.peek()?.({ payload });
    } else {
      try {
        onDispatch.emit(result);
      } finally {
        nextAction();
      }
    }

    if (error) {
      changeResultAction.peek()?.(new ActionData(error, 'error'));
      failedAction.peek()?.({ payload, error });
      throw error;
    } else {
      changeResultAction.peek()?.(new ActionData(result, 'result'));
    }

    return result;
  };
  const instance = Object.assign(
    (...args: any[]) => {
      if (callInfo.once && callInfo.dispatched) {
        return callInfo.result;
      }

      const payload = args[0];
      callInfo.dispatched = true;
      // when distinct mode enabled, skip dispatching if previous payload is equal to current payload
      if (equalFn && callInfo.count && equalFn(payload, callInfo.payload)) {
        return callInfo.result;
      }

      if (!middleware.length) {
        callInfo.result = dispatch(...args);
        return callInfo.result;
      }

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
      on: onDispatch.on,
      called() {
        return callInfo.count;
      },
      payload() {
        return callInfo.count ? callInfo.payload : null;
      },
      cancel: NOOP,
      calling: DEFAULT_CALLING,
      use(...newMiddleware: AnyFunc[]) {
        return createAction(body, middleware.concat(newMiddleware));
      },
      pipe(...functions: AnyFunc[]): any {
        return functions.reduce(
          (payload, func) => func(payload),
          instance as any,
        );
      },
      distinct(equal: AnyFunc) {
        equalFn = equal;
        return instance;
      },
      last() {
        return callInfo.count ? callInfo.payload : null;
      },
      once() {
        callInfo.once = true;
        return instance;
      },
    },
  );

  Object.defineProperties(instance, {
    result: { get: resultState.get },
    failed: { get: failedAction.get },
    loading: { get: loadingAction.get },
  });

  disposableScope.current()?.onDispose(onDispose.emit);

  return instance;
};
