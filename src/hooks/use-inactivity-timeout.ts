'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Shows a warning dialog after inactivity, then signs out.
 * Default: warn after 15 min, auto-logout after 1 more min.
 */
export function useInactivityTimeout(
  onTimeout: () => void,
  timeoutMs = 15 * 60 * 1000,
  warningMs = 60 * 1000
) {
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setShowWarning(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // Start the inactivity timer
    timeoutRef.current = setTimeout(() => {
      setShowWarning(true);

      // Start the final countdown
      warningRef.current = setTimeout(() => {
        onTimeout();
      }, warningMs);
    }, timeoutMs);
  }, [onTimeout, timeoutMs, warningMs]);

  const dismissWarning = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach((event) => document.addEventListener(event, handleActivity));
    resetTimer();

    return () => {
      events.forEach((event) => document.removeEventListener(event, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimer, showWarning]);

  return { showWarning, dismissWarning };
}
