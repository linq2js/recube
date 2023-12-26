import {
  ForwardedRef,
  ReactElement,
  createElement,
  forwardRef,
  memo,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AnyFunc } from '../types';
import { NOOP } from '../utils';

let propsChangeOptimizationEnabled = true;

export const stableCallbackMap = () => {
  const callbacks = new Map<string, { original: AnyFunc; wrapper: AnyFunc }>();
  return {
    clear() {
      callbacks.clear();
    },
    get(name: string, original: AnyFunc) {
      const existingItem = callbacks.get(name);
      if (existingItem) {
        existingItem.original = original;
        return existingItem.wrapper;
      }
      const newItem = { original, wrapper: NOOP };
      newItem.wrapper = (...args: any[]) => {
        return newItem.original(...args);
      };
      callbacks.set(name, newItem);
      return newItem.wrapper;
    },
  };
};

export type PropsChangeOptimizationAccessor = {
  (): boolean;
  (value: boolean): void;
};

export const propsChangeOptimization: PropsChangeOptimizationAccessor = (
  value?: boolean,
): any => {
  if (typeof value === 'undefined') {
    return propsChangeOptimizationEnabled;
  }

  propsChangeOptimizationEnabled = value;
  return undefined;
};

export const stable = <P extends Record<string, any>>(
  render: (props: P) => ReactElement,
) => {
  type ContainerInfo = {
    propUsages: Set<string>;
    propsProxy: P;
    mounted: boolean;
    rendering: boolean;
  };

  const Inner = memo((props: P & { __container: ContainerInfo }) => {
    const container = props.__container;

    container.propUsages.clear();
    container.rendering = true;

    const result = render(container.propsProxy);

    container.rendering = false;

    useEffect(() => {
      container.rendering = false;
    });

    return result;
  });

  return forwardRef<P extends { ref: ForwardedRef<infer R> } ? R : never, P>(
    (props, ref) => {
      const renderResultRef = useRef<any>();
      const currentRef = useRef({ ref, props });
      const [container] = useState<ContainerInfo>(() => {
        let rendering = false;
        const callbacks = stableCallbackMap();
        const propUsages = new Set<string>();

        const getPropValue = (prop: string | symbol) => {
          if (typeof prop !== 'string') {
            return undefined;
          }

          if (rendering) {
            propUsages.add(prop);
          }

          if (prop === 'ref') {
            return currentRef.current.ref;
          }

          const actualValue = currentRef.current.props[prop];

          if (typeof actualValue !== 'function') {
            return actualValue;
          }

          return callbacks.get(prop, (...args) =>
            currentRef.current.props[prop]?.(...args),
          );
        };

        return {
          propUsages,
          get rendering() {
            return rendering;
          },
          set rendering(value) {
            rendering = value;
          },
          mounted: false,
          propsProxy: new Proxy({} as P, {
            get(_, prop) {
              return getPropValue(prop);
            },
            has(_, prop) {
              return prop in currentRef.current.props;
            },
            ownKeys(_) {
              return [...Reflect.ownKeys(currentRef.current.props)];
            },
            getOwnPropertyDescriptor(_, key) {
              return {
                value: getPropValue(key),
                enumerable: true,
                configurable: true,
              };
            },
          }),
        };
      });

      currentRef.current = { ref, props };

      if (!propsChangeOptimizationEnabled) {
        return createElement(Inner, {
          ...(props as any),
          __container: container,
        });
      }

      // if the inner component has no prop accessor, just return previous render result
      if (renderResultRef.current && !container.propUsages.size) {
        return renderResultRef.current.value;
      }

      const selectedProps = {} as any;

      // we pass non-function props to Inner only
      Object.entries(props).forEach(([key, actualValue]) => {
        if (typeof actualValue === 'function') {
          return;
        }
        selectedProps[key] = actualValue;
      });

      renderResultRef.current = {
        value: createElement(Inner, {
          ...selectedProps,
          __container: container,
        }),
      };

      return renderResultRef.current.value;
    },
  );
};
