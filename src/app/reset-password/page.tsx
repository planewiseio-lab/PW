"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import PasswordRequirements from "@/components/PasswordRequirements";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isValidSession, setIsValidSession] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else {
        setMessage(
          "Invalid or expired reset link. Please request a new password reset."
        );
      }
    };

    checkSession();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Validation
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      setMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      );
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setMessage("Password updated successfully! Redirecting to login...");

      // Rediriger vers login après 2 secondes
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isValidSession && message.includes("Invalid")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Invalid Reset Link
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              href="/auth?mode=login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#178cf2] hover:brightness-110 transition"
            >
              Back to Login
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-2 mb-6">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-8 w-8 text-blue-600"
              >
                <path
                  d="M2 12.5l8.5 1.5 3.5 6 1-6 7-1.5-7-1.5-1-6-3.5 6L2 12.5z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-2xl font-bold text-gray-900">
                PlaneWise
              </span>
            </Link>
            <h2 className="text-3xl font-bold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-2 text-gray-600">Enter your new password below</p>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onSubmit={handleSubmit}
            className="mt-8 space-y-6"
          >
            <div className="space-y-4">
              <div className="relative mb-8 lg:mb-4">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setShowPasswordRequirements(true)}
                  onBlur={() => setShowPasswordRequirements(false)}
                  className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:z-10 sm:text-sm"
                  placeholder="Enter your new password"
                />
                <PasswordRequirements
                  password={password}
                  show={showPasswordRequirements}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:z-10 sm:text-sm"
                  placeholder="Confirm your new password"
                />
              </div>
            </div>

            {message && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`text-sm p-3 rounded-lg ${
                  message.includes("successfully") ||
                  message.includes("Check your email")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message}
              </motion.div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#178cf2] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Updating password...
                  </div>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{" "}
                <Link
                  href="/auth?mode=login"
                  className="font-medium text-[#178cf2] hover:text-blue-500 transition"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
