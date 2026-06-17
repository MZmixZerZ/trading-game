import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';

// Custom hook for performance optimization
export const usePerformanceOptimization = () => {
  const rafId = useRef(null);
  const lastTime = useRef(0);

  // Throttled animation frame
  const throttledRaf = useCallback((callback, delay = 16) => {
    const now = Date.now();
    if (now - lastTime.current >= delay) {
      lastTime.current = now;
      rafId.current = requestAnimationFrame(callback);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Debounced function factory
  const createDebounce = useCallback((func, delay) => {
    let timeoutId = null;
    
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  // Throttled function factory
  const createThrottle = useCallback((func, delay) => {
    let lastExec = 0;
    
    return (...args) => {
      const now = Date.now();
      if (now - lastExec >= delay) {
        lastExec = now;
        func(...args);
      }
    };
  }, []);

  return {
    throttledRaf,
    createDebounce,
    createThrottle
  };
};

// Hook for intersection observer (lazy loading)
export const useIntersectionObserver = (options = {}) => {
  const targetRef = useRef(null);
  const isIntersecting = useRef(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          target.classList.add('visible');
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [options]);

  return [targetRef, isIntersecting];
};

// Hook for optimized animations
export const useOptimizedAnimation = (animate = true) => {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !animate) return;

    // Add GPU acceleration
    element.style.willChange = 'transform';
    element.style.transform = 'translateZ(0)';
    element.style.backfaceVisibility = 'hidden';

    // Cleanup
    return () => {
      if (element) {
        element.style.willChange = 'auto';
        element.style.transform = '';
        element.style.backfaceVisibility = '';
      }
    };
  }, [animate]);

  return elementRef;
};

// Hook for prefered reduced motion
export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};

// Hook for memory management
export const useMemoryManagement = () => {
  const cleanup = useCallback(() => {
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Clear any cached data
    if (window.caches) {
      window.caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('old') || name.includes('temp')) {
            window.caches.delete(name);
          }
        });
      });
    }
  }, []);

  useEffect(() => {
    // Cleanup on component unmount
    return cleanup;
  }, [cleanup]);

  return { cleanup };
};

// Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const metricsRef = useRef({
    renderTime: 0,
    updateCount: 0,
    lastUpdate: Date.now()
  });

  const startRender = useCallback(() => {
    metricsRef.current.renderStart = performance.now();
  }, []);

  const endRender = useCallback(() => {
    if (metricsRef.current.renderStart) {
      metricsRef.current.renderTime = performance.now() - metricsRef.current.renderStart;
      metricsRef.current.updateCount += 1;
      metricsRef.current.lastUpdate = Date.now();
    }
  }, []);

  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  return {
    startRender,
    endRender,
    getMetrics
  };
};

// Memoized component wrapper
export const withPerformanceOptimization = (Component) => {
  return React.memo(Component, (prevProps, nextProps) => {
    // Custom comparison logic
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  });
};

// Virtual scrolling hook
export const useVirtualScrolling = (items = [], itemHeight = 50, containerHeight = 400) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 1, items.length);
    
    return items.slice(start, end).map((item, index) => ({
      ...item,
      index: start + index,
      top: (start + index) * itemHeight
    }));
  }, [items, itemHeight, scrollTop, containerHeight]);

  const totalHeight = items.length * itemHeight;
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll
  };
};
