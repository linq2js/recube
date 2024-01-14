import { useRef, useState } from 'react';

const DEFAULT_VERSION = {};

export const useRerender = (onRerender?: VoidFunction) => {
  const setVersion = useState(DEFAULT_VERSION)[1];
  const nextRef = useRef({ version: DEFAULT_VERSION, onRerender });
  const rerenderRef = useRef<VoidFunction>();
  nextRef.current = { version: {}, onRerender };

  if (!rerenderRef.current) {
    rerenderRef.current = () => {
      setVersion(nextRef.current);
      nextRef.current.onRerender?.();
    };
  }

  return rerenderRef.current;
};
