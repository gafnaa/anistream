import { useEffect, useState } from 'react';

export function useDelayedSkeleton(loading: boolean, delay = 150): boolean {
  const [visible, setVisible] = useState(false);
  const [previousLoading, setPreviousLoading] = useState(loading);
  if (previousLoading !== loading) {
    setPreviousLoading(loading);
    setVisible(false);
  }
  useEffect(() => {
    if (!loading) {
      return;
    }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [loading, delay]);
  return loading && visible;
}
