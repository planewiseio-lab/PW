"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UseInsufficientCreditsReturn {
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  handleInsufficientCredits: (error: any) => void;
}

export function useInsufficientCredits(): UseInsufficientCreditsReturn {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const handleInsufficientCredits = (error: any) => {
    // Vérifier si l'erreur est liée aux crédits insuffisants
    if (
      error?.message?.includes("Insufficient credits") ||
      error?.message?.includes("HTTP 402") ||
      error?.status === 402 ||
      error?.code === "INSUFFICIENT_CREDITS"
    ) {
      openModal();
    }
  };

  // Écouter les erreurs globales
  useEffect(() => {
    const handleGlobalError = (event: any) => {
      if (event.detail?.error) {
        handleInsufficientCredits(event.detail.error);
      }
    };

    window.addEventListener("insufficient-credits", handleGlobalError);

    return () => {
      window.removeEventListener("insufficient-credits", handleGlobalError);
    };
  }, []);

  return {
    showModal,
    openModal,
    closeModal,
    handleInsufficientCredits,
  };
}

// Fonction utilitaire pour déclencher l'événement global
export function triggerInsufficientCredits(error: any) {
  const event = new CustomEvent("insufficient-credits", {
    detail: { error },
  });
  window.dispatchEvent(event);
}
