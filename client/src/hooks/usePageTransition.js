import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const usePageTransition = (minLoadingTime = 1000) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // เริ่ม transition เมื่อ route เปลี่ยน
    setIsTransitioning(true);
    setIsLoading(true);

    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsTransitioning(false);
    }, minLoadingTime);

    return () => clearTimeout(timer);
  }, [location.pathname, minLoadingTime]);

  return { isLoading, isTransitioning };
};

export default usePageTransition;
