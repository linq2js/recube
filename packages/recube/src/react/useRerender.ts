import { useCallback, useRef, useState } from 'react';

const DEFAULT_STATE = {};

export const useRerender = (onRerender?: VoidFunction) => {
  const rerender = useState(DEFAULT_STATE)[1];
  const onRerenderRef = useRef(onRerender);
  onRerenderRef.current = onRerender;

  return useCallback(() => {
    rerender({});
    onRerenderRef.current?.();
  }, [rerender]);
};
