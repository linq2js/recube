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

export type StateContext<P> = {
  readonly params: P;
};

export type StaleOptions<TValue, TData> = {
  stale: true | ((value: TValue, data: TData) => boolean);
  notify?: boolean;
};

export type Listenable<T = any> = {
  on: Subscribe<T>;
  last?: () => T | null;
};

export type Reducer<TValue, TParams, TData, TNext> = (
  value: TValue extends Promise<infer D> ? AsyncResult<D> : TValue,
  result: TData,
  context: StateContext<TParams>,
) => TNext;

export type Combine<T, N> = T extends N ? (N extends T ? T : T | N) : T | N;

export type MutableState<TValue, TParams = void> = State<TValue, TParams> & {
  set: (
    valueOrReducer:
      | TValue
      | ((prev: TValue, context: StateContext<TParams>) => TValue),
    params: TParams,
  ) => void;
};

export type State<TValue, TParams = void> = {
  type: 'state';

  (params: TParams): TValue extends Promise<infer D> ? AsyncResult<D> : TValue;

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

  (payload: TPayload): TReturn extends Promise<infer D>
    ? AsyncResult<D>
    : TReturn;

  /**
   * create a listenable object from current action
   */
  pipe: {
    <R1>(f1: (p: Listenable<TData>) => R1): R1;

    <R1, R2>(f1: (p: Listenable<TData>) => R1, f2: (p: R1) => R2): R2;

    <R1, R2, R3>(
      f1: (p: Listenable<TData>) => R1,
      f2: (p: R1) => R2,
      f3: (p: R2) => R3,
    ): R3;

    <R1, R2, R3, R4>(
      f1: (p: Listenable<TData>) => R1,
      f2: (p: R1) => R2,
      f3: (p: R2) => R3,
      f4: (p: R3) => R4,
    ): R4;

    <R1, R2, R3, R4, R5>(
      f1: (p: Listenable<TData>) => R1,
      f2: (p: R1) => R2,
      f3: (p: R2) => R3,
      f4: (p: R3) => R4,
      f5: (p: R4) => R5,
    ): R5;
  };

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

  last: () => TData | null;
};

export type Listener<T = any> = (args: T) => void;

export type Subscribe<T = void> = (listener: Listener<T>) => VoidFunction;

export type AwaitableItem<TAnyPromise extends boolean = false> =
  TAnyPromise extends true
    ? Promise<any> | State<any, void> | null | undefined
    : AsyncResult | State<any, void>;

export type Awaitable<TAnyPromise extends boolean = false> =
  | AwaitableItem<TAnyPromise>
  | readonly AwaitableItem<TAnyPromise>[]
  | {
      [key: string]: AwaitableItem<TAnyPromise>;
    };

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
};

export type ActionOptions<T> = {
  name?: string;
  equal?: Equal<T>;
  once?: boolean;
};

export type CreateState = <T, P = void>(
  init: ((params: P) => T) | T,
  options?: StateOptions<NoInfer<T>>,
) => MutableState<T, P>;

export type ExtraActions<TPayload> = {
  /**
   * this action will be dispatched whenever the action body returns promise object
   */
  loading: Action<{ payload: TPayload }, void>;

  /**
   * this action will be dispatched whenever the action body throws an error or returns rejected promise object
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
