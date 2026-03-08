'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Debounced auto-save that writes form state to onboarding_sessions.step_data[stepName].
 * Only saves when formValues actually change.
 */
export function useAutoSave(
  sessionId: string | null,
  stepName: string,
  formValues: unknown,
  debounceMs = 2000
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousValuesRef = useRef<string>('');
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId) return;

    const serialized = JSON.stringify(formValues);

    // Skip if values haven't changed
    if (serialized === previousValuesRef.current) return;

    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        // Fetch existing step_data to merge
        const { data: existing } = await supabase
          .from('onboarding_sessions')
          .select('step_data')
          .eq('id', sessionId)
          .single();

        const currentStepData = (existing?.step_data as Record<string, unknown>) || {};

        await supabase
          .from('onboarding_sessions')
          .update({
            step_data: { ...currentStepData, [stepName]: formValues },
          })
          .eq('id', sessionId);

        previousValuesRef.current = serialized;
      } catch {
        // Silent fail for auto-save — don't disrupt the user
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sessionId, stepName, formValues, debounceMs, supabase]);
}
