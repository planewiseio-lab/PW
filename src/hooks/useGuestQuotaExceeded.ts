"use client";

export function triggerGuestQuotaExceeded(error: any) {
  const event = new CustomEvent("guestQuotaExceeded", {
    detail: {
      error: error.message || "Guest quota exceeded",
      guestRemaining: error.guestRemaining || 0,
      guestUsed: error.guestUsed || 4,
      guestLimit: error.guestLimit || 4,
    },
  });

  window.dispatchEvent(event);
}

export function useGuestQuotaExceeded() {
  return { triggerGuestQuotaExceeded };
}
