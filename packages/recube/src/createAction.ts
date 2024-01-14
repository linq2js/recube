import { emitter } from './emitter';
import {
  Action,
  ActionMiddlewareContext,
  ActionOptions,
  AnyFunc,
  MutableState,
} from './types';
import { async } from './async';
import { NOOP, enqueue, isPromiseLike } from './utils';
import { cancellable } from './cancellable';
import { lazyValue } from './lazyValue';
import { disposable } from './disposable';
import { createDef } from './createState';
import { batchable } from './batchable';

const DEFAULT_CALLING = () => false;

export const createAction = (
  body?: AnyFunc,
  options: ActionOptions<any> = {},
  middleware: AnyFunc[] = [],
) => {
  const { equal, once } = options;
  const onDispatch = emitter<any>({ once });
  const onDispose = emitter();
  const loadingAction = lazyValue(() => createAction() as Action<any, any>);
  const failedAction = lazyValue(
    () => createAction(createDef) as Action<any, any>,
  );
  const resultState = lazyValue<MutableState<any, void>>(() => {
    const [{ dispose }, result] = disposable(() =>
      createDef<any, void>(
        () => {
          if (callInfo.error) {
            throw callInfo.error;
          }
          return callInfo.result;
        },
        {
          name: '#ACTION_RESULT',
        },
      ),
    );
    onDispose.on(dispose);
    return result;
  });

  // keep last result for late use with resultState
  const callInfo = {
    data: undefined as any,
    error: undefined as any,
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
    once,
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

  const notify = (data: any) => {
    callInfo.data = data;
    const b = batchable();
    if (b) {
      b.add(() => onDispatch.emit(data));
    } else {
      onDispatch.emit(data);
    }
  };

  const dispatch = (...args: any[]): any => {
    const payload = args[0];
    const ac = cancellable();
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
      result = body ? body(payload) : payload;
    } catch (ex) {
      error = ex;
    }
    if (isPromiseLike(result)) {
      const originalPromise = result;

      updateContext({
        calling() {
          return calling;
        },
      });

      result = async(
        new Promise((resolve, reject) => {
          originalPromise
            .then(value => {
              calling = false;
              if (cancelled || ac?.cancelled) {
                return;
              }
              resolve(value);
              notify(value);
            })
            .catch(reason => {
              calling = false;
              if (cancelled || ac?.cancelled) {
                return;
              }
              reject(reason);
              failedAction.peek()?.(reason);
            })
            .finally(nextAction);
        }),
      );

      loadingAction.peek()?.({ payload, result });
    } else {
      try {
        notify(result);
      } finally {
        enqueue(nextAction);
      }
    }

    if (error) {
      callInfo.error = error;
      resultState.peek()?.set(() => {
        throw error;
      });
      failedAction.peek()?.({ payload, error });
      throw error;
    } else {
      resultState.peek()?.set(result);
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
      if (equal && callInfo.count && equal(payload, callInfo.payload)) {
        return callInfo.result;
      }

      if (!middleware.length) {
        callInfo.result = dispatch(...args);
        return callInfo.result;
      }

      const dispatchWrapper = middleware.reduceRight(
        (next, wrapper) => {
          return () => {
            wrapper(context, next);
          };
        },
        () => dispatch(...args),
      );

      dispatchWrapper();

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
        middleware.push(...newMiddleware);
        return instance;
      },
    },
  );

  Object.defineProperties(instance, {
    result: { get: resultState },
    failed: { get: failedAction },
    loading: { get: loadingAction },
  });

  disposable()?.add(onDispose.emit);

  return instance;
};
