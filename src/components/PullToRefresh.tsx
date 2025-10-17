"use client";

import { useCallback, useEffect, useState, useRef } from "react";

interface PullToRefreshProps {
  onRefresh: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }

    setIsPulling(false);
    setPullDistance(0);
  }, [isPulling, pullDistance, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || window.scrollY > 0) return;

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);

      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, MAX_PULL));
      }
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isPulling, pullDistance, onRefresh, disabled, handleTouchEnd]);

  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const shouldRefresh = pullDistance >= PULL_THRESHOLD;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull to refresh indicator */}
      {isPulling && (
        <div
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center bg-blue-50 transition-all duration-200"
          style={{
            height: `${Math.min(pullDistance * 0.5, 60)}px`,
            transform: `translateY(${Math.min(pullDistance * 0.3, 30)}px)`,
          }}
        >
          <div className="flex items-center gap-2 text-blue-600">
            {isRefreshing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-sm font-medium">Refreshing...</span>
              </>
            ) : (
              <>
                <svg
                  className={`h-4 w-4 transition-transform duration-200 ${
                    shouldRefresh ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
                <span className="text-sm font-medium">
                  {shouldRefresh ? "Release to refresh" : "Pull to refresh"}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className={`transition-transform duration-200 ${
          isPulling ? "transform" : ""
        }`}
        style={{
          transform: `translateY(${
            isPulling ? Math.min(pullDistance * 0.3, 30) : 0
          }px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
