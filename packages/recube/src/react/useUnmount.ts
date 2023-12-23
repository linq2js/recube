import { useEffect, useRef } from 'react';

export const useUnmount = (callback: VoidFunction) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(
    () => () => {
      callbackRef.current();
    },
    [],
  );
};
