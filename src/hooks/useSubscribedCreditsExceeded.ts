import { useEffect } from "react";

export function useSubscribedCreditsExceeded() {
  useEffect(() => {
    // This hook can be used to set up any global listeners if needed
    // The modal will be triggered by dispatching the custom event
  }, []);
}

export function triggerSubscribedCreditsExceeded(error: any) {
  const event = new CustomEvent("subscribedCreditsExceeded", {
    detail: {
      creditsRemaining: 0,
      error: error,
    },
  });
  window.dispatchEvent(event);
}
