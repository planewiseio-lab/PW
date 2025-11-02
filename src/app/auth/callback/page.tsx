"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleVerification = async () => {
      const supabase = createClient();
      let shouldShowConfirmation = false;
      
      // Check hash fragments (Supabase auth redirects with #access_token=...)
      if (window.location.hash) {
        try {
          // Let Supabase handle the hash fragments
          const { data, error } = await supabase.auth.getSession();
          
          if (!error && data?.session) {
            shouldShowConfirmation = true;
          }
        } catch (err) {
          console.error("[AuthCallback] Error verifying:", err);
        }
      }
      
      // Check query parameters (legacy Supabase email verification)
      const token = searchParams.get("token");
      const type = searchParams.get("type");
      
      // If token and type are present (email verification)
      if (token && type === "signup") {
        shouldShowConfirmation = true;
      }
      
      // If no verification detected but user reached this page, show confirmation anyway
      if (!shouldShowConfirmation) {
        shouldShowConfirmation = true;
      }
      
      if (shouldShowConfirmation) {
        setIsConfirmed(true);
        
        // Start countdown
        let remaining = 5;
        setCountdown(remaining);
        
        intervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            const next = prev - 1;
            if (next <= 0) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              router.push("/auth?mode=login");
              return 0;
            }
            return next;
          });
        }, 1000);
      }
    };

    handleVerification();
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [router, searchParams]);

  if (!isConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full"
      >
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.1,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1.2 }}
                transition={{
                  delay: 0.3,
                  duration: 0.4,
                }}
                className="absolute inset-0 bg-green-400 rounded-full opacity-20 animate-ping"
              />
            </div>
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              Email Confirmed!
            </h2>
            <p className="text-gray-600">
              Your email has been successfully verified. You can now sign in to your account.
            </p>
          </motion.div>

          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-3 pt-4"
          >
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
              <span className="text-sm text-gray-500">
                Redirecting to sign in in {countdown} second{countdown !== 1 ? "s" : ""}...
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-green-500 h-2 rounded-full"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
              />
            </div>

            {/* Manual redirect button */}
            <button
              onClick={() => router.push("/auth?mode=login")}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Sign In Now
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

