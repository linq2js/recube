import { action as createAction } from './action';
import { createState } from './createState';
import { Action, AnyFunc, Reducer, StaleOptions, StateOptions } from './types';

export type EnhancedState<TValue, TParams> = {
  /**
   * create an action/action map and handle state reducing whenever the action(s) dispatched
   */
  action: {
    (options: StaleOptions<TValue, void>): Action;
    <TPayload>(
      reducer: Reducer<
        TValue,
        TParams,
        TPayload,
        TValue extends PromiseLike<infer D> ? D | PromiseLike<D> : TValue
      >,
    ): Action<TPayload>;
    <
      TReducers extends Record<
        string,
        | Reducer<
            TValue,
            TParams,
            any,
            TValue extends PromiseLike<infer D> ? D | PromiseLike<D> : TValue
          >
        | StaleOptions<TValue, any>
      >,
    >(
      reducers: TReducers,
    ): {
      [key in keyof TReducers]: TReducers[key] extends
        | (() => any)
        | ((value: any) => any)
        ? Action<void>
        : TReducers[key] extends (
            value: any,
            result: infer TPayload,
            ...args: any[]
          ) => TValue extends PromiseLike<infer D> ? D | PromiseLike<D> : TValue
        ? Action<TPayload, TPayload, TPayload>
        : TReducers[key] extends StaleOptions<TValue, infer TData>
        ? Action<TData, TData, TData>
        : never;
    };
  };
};

export const state = <T, P = void>(
  init: T | ((params: P) => T),
  stateOptions?: StateOptions,
) => {
  return createState(
    (state): EnhancedState<T, P> => {
      return {
        action(
          options:
            | StaleOptions<any, any>
            | AnyFunc
            | Record<string, AnyFunc | StaleOptions<any, any>>,
        ): any {
          // single action
          if (typeof options === 'function' || 'stale' in options) {
            const action = createAction<any>();
            state.when(action, options as any);
            return action;
          }

          // multiple actions
          const actions = {} as Record<string, AnyFunc>;
          Object.entries(options).forEach(([key, value]) => {
            const action = createAction<any>();
            state.when(action, value as any);
            actions[key] = action;
          });
          return actions;
        },
      };
    },
    init,
    stateOptions,
  );
};
