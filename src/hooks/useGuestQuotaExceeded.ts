"use client";

export function triggerGuestQuotaExceeded(error: any) {
  console.log("[triggerGuestQuotaExceeded] Triggering event with:", {
    error: error.message || "Guest quota exceeded",
    guestRemaining: error.guestRemaining || 0,
    guestUsed: error.guestUsed || 4,
    guestLimit: error.guestLimit || 4,
    guestTtl: error.guestTtl || error.ttl || 0,
  });
  
  const event = new CustomEvent("guestQuotaExceeded", {
    detail: {
      error: error.message || "Guest quota exceeded",
      guestRemaining: error.guestRemaining || 0,
      guestUsed: error.guestUsed || 4,
      guestLimit: error.guestLimit || 4,
      guestTtl: error.guestTtl || error.ttl || 0, // TTL en secondes
    },
  });

  window.dispatchEvent(event);
  console.log("[triggerGuestQuotaExceeded] Event dispatched");
}

export function useGuestQuotaExceeded() {
  return { triggerGuestQuotaExceeded };
}
