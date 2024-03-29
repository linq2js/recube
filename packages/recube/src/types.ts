export type AnyFunc = (...args: any[]) => any;

export type NoInfer<T> = [T][T extends any ? 0 : never];

export type Equal<T = any> = (a: T, b: T) => boolean;

/**
 * Empty Object
 */
export type EO = Record<string, never>;

export type Dictionary<
  V = any,
  K extends string | symbol | number = string,
> = Record<K, V>;

export type StateContext<T, P> = {
  readonly params: P;

  optimistic: <TNext>(
    value: TNext,
    valueOrLoader: PromiseLike<TNext> | (() => T | TNext | PromiseLike<TNext>),
    rollback?: (current: T, error: unknown) => T,
  ) => TNext;
};

export type StaleOptions<TValue, TData> = {
  stale: true | ((value: TValue, data: TData) => boolean);
  includeDependencies?: 'all' | 'error';
};

export type Listenable<T = any> = {
  on: Subscribe<T>;
};

export type Reducer<TValue, TParams, TData, TNext> = (
  value: TValue,
  result: TData,
  context: StateContext<TValue, TParams>,
) => TNext;

export type Combine<T, N> = T extends N ? (N extends T ? T : T | N) : T | N;

export type MutableState<TValue, TParams = void> = State<TValue, TParams> & {
  set: (
    valueOrReducer:
      | TValue
      | ((prev: TValue, context: StateContext<TValue, TParams>) => TValue),
    params: TParams,
  ) => void;
};

export type State<TValue, TParams = void> = {
  type: 'state';

  (params: TParams): TValue;

  when: {
    /**
     * listen specified event and mutate the state with event data
     */
    <TData>(listenable: Listenable<TData>): State<
      Combine<TValue, TData>,
      TParams
    >;

    /**
     * listen specified event and mutate the state with result of reducer
     */
    <TData, TNext>(
      listenable: Listenable<TData>,
      reducer: Reducer<TValue, TParams, TData, TNext>,
    ): State<Combine<TValue, TNext>, TParams>;

    // listen specified event and mark the state is staled
    <TData>(
      listenable: Listenable<TData>,
      staleOptions: StaleOptions<TValue, TData>,
    ): State<TValue, TParams>;
  };

  wipe: (filter?: (params: TParams) => boolean) => void;

  size: () => number;

  forEach: (callback: (params: TParams) => void) => void;

  peek: (params: TParams) => TValue;
};

export type ActionMiddleware = (
  context: ActionMiddlewareContext,
  dispatch: VoidFunction,
) => void;

export type Accessor<T = any> = {
  (): T;
  (value: T): void;
};

export type ActionMiddlewareContext = {
  cancel: () => void;
  onDone: VoidFunction[];
  calling: () => boolean;
  called: () => number;
  /**
   * The data object persists across action executions
   */
  readonly data: Record<string | number | symbol, any>;

  on: Subscribe<void>;
};

export type AnyAction = Action<any, any, any>;

/**
 * Action object
 */
export type Action<TData = void, TPayload = void, TReturn = TData> = Listenable<
  TData extends Promise<infer D> ? D : TData
> & {
  readonly type: 'action';

  (payload: TPayload): TReturn;

  use: (...middleware: ActionMiddleware[]) => Action<TData, TPayload, void>;

  /**
   * state that holds last execution result
   */
  readonly result: State<TData | undefined>;

  /**
   * returns current payload. Returns undefined if action is not executed yet
   * @returns
   */
  payload: () => TPayload | null;

  /**
   * returns whether action is calling or not
   * @returns
   */
  calling: () => boolean;

  called: () => number;

  /**
   * cancel current execution
   * @returns
   */
  cancel: () => void;
};

export type Listener<T = any> = (args: T) => void;

export type Subscribe<T = void> = (listener: Listener<T>) => VoidFunction;

export type Loadable<T> =
  | { loading: false; data: T; error: undefined }
  | { loading: false; error: any; data: undefined }
  | { loading: true; data: undefined; error: undefined };

export type AsyncResult<T = any> = Promise<T> & Loadable<T> & Listenable<void>;

export type ImmutableType =
  | string
  | number
  | boolean
  | bigint
  | null
  | undefined
  | Date
  | symbol
  | RegExp;

export type StateOptions<T> = {
  name?: string;
  equal?: Equal<NoInfer<T>>;
  eager?: boolean;
};

export type ActionOptions<T> = {
  name?: string;
  equal?: Equal<T>;
  once?: boolean | OnceOptions;
};

export type CreateState = <T, P = void>(
  init: ((params: P) => T) | T,
  options?: StateOptions<NoInfer<T>>,
) => MutableState<T, P>;

export type ExtraActions<TData, TPayload> = {
  /**
   * this action will be dispatched whenever the action body returns promise object
   */
  loading: Action<{ payload: TPayload; result: PromiseLike<TData> }, void>;

  /**
   * this action will be dispatched whenever the action body throws an error or returns rejected promise object
   */
  failed: Action<{ payload: TPayload; error: unknown }, void>;
};

export type CreateAction = {
  <TData = void>(options?: ActionOptions<NoInfer<TData>>): Action<
    TData,
    TData
  > &
    ExtraActions<TData, TData>;
  <TData, TPayload = void>(
    body: (payload: TPayload) => TData,
    options?: ActionOptions<NoInfer<TData>>,
  ): Action<TData, TPayload> & ExtraActions<TData, TPayload>;
};

export type OnceOptions = { recent?: boolean };
