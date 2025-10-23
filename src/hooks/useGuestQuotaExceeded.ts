"use client";

export function triggerGuestQuotaExceeded(error: any) {
  const event = new CustomEvent("guestQuotaExceeded", {
    detail: {
      error: error.message || "Guest quota exceeded",
      guestRemaining: error.guestRemaining || 0,
      guestUsed: error.guestUsed || 3,
      guestLimit: error.guestLimit || 3,
    },
  });

  window.dispatchEvent(event);
}

export function useGuestQuotaExceeded() {
  return { triggerGuestQuotaExceeded };
}
