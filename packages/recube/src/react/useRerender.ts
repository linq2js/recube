import { useCallback, useRef, useState } from 'react';
import { batchScope } from '../batchScope';

const DEFAULT_STATE = {};

export const useRerender = (onRerender?: VoidFunction) => {
  const rerender = useState(DEFAULT_STATE)[1];
  const onRerenderRef = useRef(onRerender);
  onRerenderRef.current = onRerender;

  return useCallback(() => {
    const innerRerender = () => {
      rerender({});
      onRerenderRef.current?.();
    };
    if (!batchScope.current()?.addUpdater(innerRerender)) {
      innerRerender();
    }
  }, [rerender]);
};
