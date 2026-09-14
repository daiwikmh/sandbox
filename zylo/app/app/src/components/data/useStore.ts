"use client";

import { useEffect, useState } from 'react';
import { subscribe } from '../../midnight/store';

export function useStore<T>(read: () => T, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const refresh = () => setValue(read());
    refresh();
    return subscribe(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}
