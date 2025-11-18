"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "@/components/LazyMotion";

function MaintenanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Vérifier si un token est présent dans l'URL
  useEffect(() => {
    const token = searchParams?.get("token");
    if (token) {
      setAccessToken(token);
      handleAccess(token);
    }
  }, [searchParams]);

  const handleAccess = async (token?: string) => {
    const tokenToUse = token || accessToken;
    if (!tokenToUse) {
      setError("Veuillez entrer un token d'accès");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Vérifier le token via une API route
      const response = await fetch("/api/test-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: tokenToUse }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        // Stocker le token dans un cookie pour la session
        document.cookie = `test_access_token=${tokenToUse}; path=/; max-age=86400; SameSite=Lax`;
        // Rediriger vers la page d'accueil
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Token invalide");
      }
    } catch (err) {
      setError("Erreur lors de la vérification du token");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Accès Restreint
          </h1>
          <p className="text-gray-600">
            Le site est actuellement en phase de test.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Veuillez entrer votre token d'accès pour continuer.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAccess();
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Token d'accès
            </label>
            <input
              id="token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Entrez votre token d'accès"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading || !accessToken}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Vérification...
              </>
            ) : (
              "Accéder au site"
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Si vous êtes un testeur autorisé et n'avez pas de token,{" "}
            <a
              href="mailto:support@plane-wise.com"
              className="text-blue-600 hover:underline"
            >
              contactez le support
            </a>
            .
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement...</p>
            </div>
          </div>
        </div>
      }
    >
      <MaintenanceContent />
    </Suspense>
  );
}

