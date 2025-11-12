"use client";

export default function TestModalsPage() {
  // Simuler InsufficientCreditsModal
  const triggerInsufficientCredits = () => {
    const event = new CustomEvent("insufficient-credits", {
      detail: {
        error: {
          message: "Insufficient credits",
          status: 402,
          code: "INSUFFICIENT_CREDITS",
        },
      },
    });
    window.dispatchEvent(event);
  };

  // Simuler FreeCreditsExceededModal
  const triggerFreeCreditsExceeded = () => {
    const event = new CustomEvent("freeCreditsExceeded", {
      detail: {
        creditsRemaining: 0,
        freeUserRemaining: 0,
        freeUserUsed: 50,
        freeUserLimit: 50,
        error: "Free user quota exceeded",
      },
    });
    window.dispatchEvent(event);
  };

  // Simuler GuestQuotaExceededModal
  const triggerGuestQuotaExceeded = () => {
    const event = new CustomEvent("guestQuotaExceeded", {
      detail: {
        error: "Guest quota exceeded",
        guestRemaining: 0,
        guestUsed: 3,
        guestLimit: 3,
        guestTtl: 86400, // 24h en secondes
      },
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Test des Modals de Crédits
        </h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* InsufficientCreditsModal */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              InsufficientCreditsModal
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Modal pour tous les utilisateurs (Free, Basic, Pro) qui n'ont plus
              de crédits.
            </p>
            <button
              onClick={triggerInsufficientCredits}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Déclencher le Modal
            </button>
          </div>

          {/* FreeCreditsExceededModal */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              FreeCreditsExceededModal
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Modal spécifique pour les utilisateurs Free qui ont épuisé leurs
              50 crédits mensuels.
            </p>
            <button
              onClick={triggerFreeCreditsExceeded}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              Déclencher le Modal
            </button>
          </div>

          {/* GuestQuotaExceededModal */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              GuestQuotaExceededModal
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Modal pour les utilisateurs non identifiés qui ont atteint leur
              limite de 3 requêtes sur 24h. Affiche un countdown de 24h.
            </p>
            <button
              onClick={triggerGuestQuotaExceeded}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Déclencher le Modal
            </button>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            Instructions:
          </h3>
          <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
            <li>
              Cliquez sur les boutons ci-dessus pour déclencher les modals
            </li>
            <li>
              Les modals s'afficheront par-dessus la page actuelle
            </li>
            <li>
              Vous pouvez fermer les modals en cliquant sur le X ou en appuyant
              sur Escape
            </li>
            <li>
              Pour tester la page standalone, visitez{" "}
              <a
                href="/insufficient-credits"
                className="underline font-semibold"
              >
                /insufficient-credits
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

