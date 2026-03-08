import { createBrowserClient } from '@supabase/ssr';

// Simple in-process lock to avoid navigator.locks deadlock in React 18 strict mode.
// navigator.locks (Web Lock API) can deadlock when the singleton Supabase client
// is initialised during a React strict-mode double-mount cycle.
let lockCounter = 0;
const processLock = async (
  name: string,
  acquireTimeout: number,
  fn: () => Promise<unknown>
) => {
  lockCounter += 1;
  try {
    return await fn();
  } finally {
    lockCounter -= 1;
  }
};

// Browser-side Supabase client (used in Client Components)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        lock: processLock as any,
      },
    }
  );
}
