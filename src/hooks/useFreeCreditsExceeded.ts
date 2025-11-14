import { useEffect } from "react";

export function useFreeCreditsExceeded() {
  useEffect(() => {
    // This hook can be used to set up any global listeners if needed
    // The modal will be triggered by dispatching the custom event
  }, []);
}

export function triggerFreeCreditsExceeded(error: any) {
  console.log("[triggerFreeCreditsExceeded] Triggering event with:", {
    error: error.message || error.error || "Free user quota exceeded",
    creditsRemaining: error.creditsRemaining ?? error.freeUserRemaining ?? 0,
    freeUserUsed: error.freeUserUsed ?? 0,
    freeUserLimit: error.freeUserLimit ?? 5,
    freeUserTtl: error.freeUserTtl ?? error.ttl ?? 0,
  });
  
  const event = new CustomEvent("freeCreditsExceeded", {
    detail: {
      creditsRemaining: error.creditsRemaining ?? error.freeUserRemaining ?? 0,
      freeUserRemaining: error.freeUserRemaining ?? 0,
      freeUserUsed: error.freeUserUsed ?? 0,
      freeUserLimit: error.freeUserLimit ?? 5,
      freeUserTtl: error.freeUserTtl ?? error.ttl ?? 0, // TTL en secondes
      error: error.error || error.message || error,
    },
  });
  window.dispatchEvent(event);
  console.log("[triggerFreeCreditsExceeded] Event dispatched");
}

