import { AnyFunc, Dictionary } from './types';

export type ScopeEvents = 'onExit' | 'onEnter';

export type ScopeDef<T> = {
  readonly type: 'scope';
  /**
   * get current scope instance
   */
  (): Omit<T, ScopeEvents> | undefined;

  /**
   * execute a function with new scope instance of this definition or give scope snapshot
   */
  <R>(fn: () => R, snapshot?: T | ScopeSnapshot): [T, R];

  /**
   * create new scope instance
   * @returns
   */
  new: () => Omit<T, ScopeEvents>;
};

export type ScopeSnapshot = {
  readonly type: 'snapshot';

  (): WeakMap<any, any>[];

  /**
   * get scope instance of single scope definition
   */
  <T>(scope: ScopeDef<T>): T;

  /**
   * get scope instances of multiple scope definitions
   */
  <T extends ScopeDef<any>[] | Dictionary<ScopeDef<any>>>(scopes: T): {
    [key in keyof T]: T[key] extends ScopeDef<infer I> ? I : never;
  };
};

export type Scope = {
  /**
   * get snapshot of all scope instances
   */
  (): ScopeSnapshot;

  /**
   * create a scope definition
   */
  <T extends Dictionary>(create: () => T): ScopeDef<T>;

  /**
   * execute a function with scope instances that are created from specified scope definitions
   */
  <T extends Dictionary<ScopeDef<any>>, R>(defs: T, fn: () => R): [
    { [key in keyof T]: T[key] extends ScopeDef<infer I> ? I : never },
    R,
  ];

  <T>(snapshot: ScopeSnapshot, fn: () => T): T;
};

/**
 * Storing the active scopes as stack. The structure is as follows, the active is the first:
 * ```
 * [0] WeakMap(disposable)
 * [1] WeakMap(trackable)
 * [2] WeakMap(disposable)
 * ...other items
 * ```
 *
 * If we want to find the active scope of `disposable` type, the `disposable` scope located within the first item (item zero) will be found.
 */
let activeScopeStack: WeakMap<any, ScopeDef<any>>[] = [];
const SCOPE_SNAPSHOT_PROP = Symbol('scopeSnapshot');

const find = (key: any, stack: WeakMap<any, any>[]) => {
  for (const item of stack) {
    const value = item.get(key);
    if (value) {
      return value;
    }
  }
  return undefined;
};

const createScope = (create: AnyFunc) => {
  let accessor: AnyFunc;

  const get = () => {
    return find(accessor, activeScopeStack);
  };

  accessor = (...args: any[]) => {
    if (!args.length) {
      return get();
    }
    const [fn, snapshot] = args;
    const customScope =
      typeof snapshot === 'function' ? snapshot(accessor) : snapshot;
    const current = customScope ?? create();
    const { onEnter, onExit } = current ?? {};
    const map = new WeakMap();
    const prevStack = activeScopeStack;
    map.set(accessor, current);
    activeScopeStack = [map, ...activeScopeStack];

    try {
      if (typeof onEnter === 'function') {
        onEnter();
      }

      return [current, fn()] as const;
    } finally {
      // restore prev stack
      activeScopeStack = prevStack;

      if (typeof onExit === 'function') {
        onExit();
      }
    }
  };

  return Object.assign(accessor, { type: 'scope', new: create }) as any;
};

export const scope: Scope = (...args: any[]): any => {
  // scope()
  if (!args.length) {
    let snapshotMethods = (activeScopeStack as any)[SCOPE_SNAPSHOT_PROP];

    if (!snapshotMethods) {
      const snapshot = activeScopeStack;
      snapshotMethods = Object.assign(
        (type: any) => {
          if (!type) {
            return snapshot;
          }
          // is ScopeDef
          if (typeof type === 'function') {
            return find(type, snapshot);
          }
          if (Array.isArray(type)) {
            return type.map(x => find(x, snapshot));
          }
          const obj: Dictionary = {};
          Object.keys(type).forEach(key => {
            obj[key] = find(type[key], snapshot);
          });
          return obj;
        },
        { type: 'snapshot' },
      );
    }
    (activeScopeStack as any)[SCOPE_SNAPSHOT_PROP] = snapshotMethods;

    return snapshotMethods;
  }

  // scope(create)
  if (args.length === 1) {
    return createScope(args[0]);
  }

  // scope(snapshot, fn)
  if (typeof args[0] === 'function') {
    const [snapshot, fn] = args as [ScopeSnapshot, AnyFunc];
    const prevStack = activeScopeStack;
    activeScopeStack = snapshot();
    try {
      return fn();
    } finally {
      activeScopeStack = prevStack;
    }
  }

  // scope(defs, fn)
  const [scopeTypes, fn] = args as [Record<string, AnyFunc>, AnyFunc];
  const scopes: Dictionary = {};
  const keys = Object.keys(scopeTypes);

  return [
    scopes,
    keys.reduceRight(
      (next, key) => () => {
        const [scope, result] = scopeTypes[key](next);
        scopes[key] = scope;
        return result;
      },
      fn,
    )(),
  ];
};
