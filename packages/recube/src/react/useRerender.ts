import { useRef, useState } from 'react';

const DEFAULT_VERSION = 0;

export const useRerender = (onRerender?: VoidFunction) => {
  const setVersion = useState(DEFAULT_VERSION)[1];
  const nextRef = useRef({ version: DEFAULT_VERSION, onRerender });
  const rerenderRef = useRef<VoidFunction>();
  nextRef.current = { version: nextRef.current.version + 1, onRerender };

  if (!rerenderRef.current) {
    rerenderRef.current = () => {
      setVersion(nextRef.current.version);
      nextRef.current.onRerender?.();
    };
  }

  return rerenderRef.current;
};
