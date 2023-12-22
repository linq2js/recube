export type AnyFunc = (...args: any[]) => any;

export type NoInfer<T> = [T][T extends any ? 0 : never];

export type Equal<T = any> = (a: T, b: T) => boolean;

/**
 * Empty Object
 */
export type EO = Record<string, never>;

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

export type State<TValue, TParams = void> = {
  type: 'state';

  (params: TParams): TValue extends Promise<infer D> ? AsyncResult<D> : TValue;

  distinct: (equal: Equal<TValue>) => State<TValue, TParams>;

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

  when: {
    /**
     * listen specified event and mutate the state with event data
     */
    <TData>(listenable: Listenable<TData>): State<TValue | TData, TParams>;

    /**
     * listen specified event and mutate the state with result of reducer
     */
    <TData, TNext>(
      listenable: Listenable<TData>,
      reducer: Reducer<TValue, TParams, TData, TNext>,
    ): State<TValue | TNext, TParams>;

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

export type Action<TData = void, TPayload = void, TReturn = TData> = Listenable<
  TData extends Promise<infer D> ? D : TData
> & {
  readonly type: 'action';

  (payload: TPayload): TReturn extends Promise<infer D>
    ? AsyncResult<D>
    : TReturn;

  once: () => Action<TData, TPayload, TReturn>;

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

  distinct: (equal: Equal<TPayload>) => Action<TData, TPayload, TReturn>;

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
