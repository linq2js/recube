import { useMemo, useRef, useState } from 'react';
import { Equal } from 'src/types';

const DEFAULT_STATE = {};

export const useRerender = (
  onRerender?: VoidFunction,
  equal: Equal = Object.is,
): ((dependencies?: any[]) => void) => {
  const originRerender = useState(DEFAULT_STATE)[1];
  const onRerenderRef = useRef(onRerender);
  onRerenderRef.current = onRerender;

  return useMemo(() => {
    let prevArgs: any[] | undefined;
    const rerender = () => {
      originRerender({});
      onRerenderRef.current?.();
    };

    return (dependencies?: any[]) => {
      if (!Array.isArray(dependencies)) {
        prevArgs = undefined;
        rerender();
      } else if (
        !prevArgs ||
        prevArgs.some((x, i) => equal(x, dependencies[i]))
      ) {
        prevArgs = dependencies;
        rerender();
      }
    };
  }, [originRerender]);
};
