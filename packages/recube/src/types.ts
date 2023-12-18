import { Emitter } from './emitter';

export type AnyFunc = (...args: any[]) => any;

export type NoInfer<T> = [T][T extends any ? 0 : never];

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
};

export type State<TValue, TParams = void> = {
  type: 'state';

  (params: TParams): TValue extends Promise<infer D> ? AsyncResult<D> : TValue;

  distinct: (
    equalFn: (a: TValue, b: TValue) => boolean,
  ) => State<TValue, TParams>;

  /**
   * create an action/action map and handle state reducing whenever the action(s) dispatched
   */
  action: {
    <TPayload>(
      reducer: (
        value: TValue extends Promise<infer D> ? AsyncResult<D> : TValue,
        result: TPayload,
        context: StateContext<TParams>,
      ) => TValue extends PromiseLike<infer D> ? D | PromiseLike<D> : TValue,
    ): Action<TPayload>;

    <
      TReducers extends Record<
        string,
        (
          value: TValue extends Promise<infer D> ? AsyncResult<D> : TValue,
          result: any,
          context: StateContext<TParams>,
        ) => TValue extends PromiseLike<infer D> ? D | PromiseLike<D> : TValue
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
          ) => any
        ? Action<TPayload>
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
      reducer: (
        value: TValue extends Promise<infer D> ? AsyncResult<D> : TValue,
        result: TData extends Promise<infer D> ? D : TData,
        context: StateContext<TParams>,
      ) => TNext,
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

export type ActionMiddleware<TPayload = any> = (
  context: ActionMiddlewareContext<TPayload>,
  dispatch: VoidFunction,
) => void;

export type ActionMiddlewareContext<TPayload = any> = {
  cancel: () => void;
  onDone: VoidFunction[];
  calling: () => boolean;
  readonly called: number;
  /**
   * The data object persists across action executions
   */
  readonly data: Record<string | number | symbol, any>;

  /**
   * get current payload
   * @returns
   */
  payload: () => TPayload;

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

  use: (
    ...middleware: ActionMiddleware<TPayload>[]
  ) => Action<TData, TPayload, void>;

  readonly called: () => boolean;
  /**
   * state that holds last execution result
   */
  readonly result: State<TData | undefined>;

  /**
   * eturns current payload. Returns undefined if action is not executed yet
   * @returns
   */
  payload: () => TPayload | undefined;

  /**
   * returns whether action is calling or not
   * @returns
   */
  calling: () => boolean;

  /**
   * cancel current execution
   * @returns
   */
  cancel: () => void;

  /**
   * create a new listenable object from current action listenable using specified transmitters
   * @param transmitter
   * @param otherTransmitters
   * @returns
   */
  with: (
    transmitter: ActionTransmitter<TData>,
    ...otherTransmitters: ActionTransmitter<TData>[]
  ) => Listenable<TData>;

  distinct: (
    equalFn: (a: TPayload, b: TPayload) => boolean,
  ) => Action<TData, TPayload, TReturn>;
};

export type Listener<T = any> = (args: T) => void;

export type ActionTransmitter<T> = (next: Emitter<T>) => Subscribe<T>;

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
