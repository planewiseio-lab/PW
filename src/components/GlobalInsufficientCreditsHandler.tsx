"use client";

import { useInsufficientCredits } from "@/hooks/useInsufficientCredits";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";

export function GlobalInsufficientCreditsHandler() {
  const { showModal, closeModal } = useInsufficientCredits();

  return <InsufficientCreditsModal isOpen={showModal} onClose={closeModal} />;
}
