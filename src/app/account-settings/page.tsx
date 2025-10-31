"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import PasswordRequirements from "@/components/PasswordRequirements";

export default function AccountSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Reset state when component mounts or pathname changes (navigation)
    setLoading(true);
    setUser(null);
    setFullName("");
    setEmail("");

    const checkAuth = async () => {
      try {
        console.log("[Account Settings] Checking authentication...");
        const supabase = createClient();

        // Try to get session first
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.log(
            "[Account Settings] Session error:",
            sessionError.message
          );
          // If session error, try to get user directly
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError) {
            console.log("[Account Settings] User error:", userError.message);
            setLoading(false);
            router.replace("/login");
            return;
          }

          if (user) {
            console.log("[Account Settings] User found via getUser:", user.id);
            setUser(user);
            setFullName(user.user_metadata?.full_name || "");
            setEmail(user.email || "");
            setLoading(false);
            return;
          }
        }

        if (session?.user) {
          console.log(
            "[Account Settings] User found via session:",
            session.user.id
          );
          setUser(session.user);
          setFullName(session.user.user_metadata?.full_name || "");
          setEmail(session.user.email || "");
          setLoading(false);
          return;
        }

        // No user found
        console.log("[Account Settings] No user found, redirecting to login");
        setLoading(false);
        router.replace("/login");
      } catch (err) {
        console.error("[Account Settings] Error checking auth:", err);
        setLoading(false);
        router.push("/login");
      }
    };

    checkAuth();

    // Safety timeout
    const timeoutId = setTimeout(() => {
      console.log("[Account Settings] Safety timeout triggered");
      setLoading(false);
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pathname, router]); // Re-run when pathname changes (navigation)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });

      if (error) throw error;

      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSendPasswordReset = async () => {
    setIsSendingResetEmail(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(
        user?.email || "",
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) throw error;

      setMessage("Password reset email sent! Check your inbox.");
      setTimeout(() => setMessage(""), 5000);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      return;
    }

    setLoadingAction(true);
    setMessage("");

    try {
      // Make a request to delete the user account
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      if (data.requiresSupport) {
        setMessage(
          "Account session terminated. Please contact support to complete account deletion."
        );
        setLoadingAction(false);
        return;
      }

      setMessage("Account deleted successfully. Redirecting...");

      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setLoadingAction(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  const tabs = [
    { id: "profile", name: "Profile", icon: "👤" },
    { id: "security", name: "Security", icon: "🔒" },
    { id: "subscription", name: "Subscription", icon: "💳" },
    { id: "preferences", name: "Preferences", icon: "⚙️" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Account Settings
          </h1>
          <p className="text-gray-600">
            Manage your account preferences, security, and subscription.
          </p>
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg ${
              message.includes("success") ||
              message.includes("updated") ||
              message.includes("sent") ||
              message.includes("Password reset email sent") ||
              message.includes("Check your inbox") ||
              message.includes("deleted successfully")
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Profile Information
                    </h2>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Email cannot be changed. Contact support if needed.
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          type="submit"
                          disabled={loadingAction}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                        >
                          {loadingAction ? "Updating..." : "Update Profile"}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Account Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account Created
                        </label>
                        <p className="text-gray-900">
                          {user?.created_at
                            ? new Date(user.created_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Sign In
                        </label>
                        <p className="text-gray-900">
                          {user?.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Change Password
                    </h2>

                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <svg
                              className="w-5 h-5 text-blue-600 mt-0.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-medium text-blue-900">
                              Secure Password Reset
                            </h3>
                            <p className="text-sm text-blue-700 mt-1">
                              For security reasons, password changes are handled
                              via email verification. Click the button below to
                              receive a secure password reset link.
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleSendPasswordReset}
                        disabled={isSendingResetEmail}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                        {isSendingResetEmail ? (
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
                            Sending Reset Email...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                            Send Password Reset Email
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Security Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-gray-600"
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
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Two-Factor Authentication
                            </h4>
                            <p className="text-sm text-gray-500">
                              Add an extra layer of security
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          Coming Soon
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V1H4v4zM15 1v4h6V1h-6z"
                            />
                          </svg>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Login Notifications
                            </h4>
                            <p className="text-sm text-gray-500">
                              Get notified of new sign-ins
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          Coming Soon
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-4">
                      Danger Zone
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-red-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          <div>
                            <h4 className="font-medium text-red-900">
                              Delete Account
                            </h4>
                            <p className="text-sm text-red-700">
                              Permanently delete your account and all data
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={loadingAction}
                          className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          {loadingAction ? "Processing..." : "Delete Account"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Subscription Tab */}
              {activeTab === "subscription" && (
                <div className="space-y-6">
                  {/* Available Plans */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">
                      Available Plans
                    </h3>

                    <div className="grid gap-6 md:grid-cols-2">
                      {[
                        {
                          name: "Subscribed",
                          price: "$0",
                          note: "/mo",
                          perks: [
                            "Aircraft lookup",
                            "Flight history",
                            "Airport information",
                            "Basic specs & photos",
                            "Community support",
                            "Ads",
                          ],
                          cta: {
                            href: "/register",
                            text: "Get started",
                            className: "bg-brand-600 hover:bg-brand-700",
                          },
                          wrapClass: "border-brand-200",
                          badge: "Popular",
                          current: true,
                        },
                        {
                          name: "Pro",
                          price: "$9.99",
                          note: "/mo",
                          perks: [
                            "Aircraft lookup",
                            "Flight history",
                            "Airport information",
                            "Basic specs & photos",
                            "Community support",
                            "Priority processing",
                          ],
                          cta: {
                            href: "/checkout?plan=pro",
                            text: "Choose Pro",
                            className: "bg-gray-900 hover:bg-black",
                          },
                          wrapClass: "border-gray-200",
                          current: false,
                        },
                      ].map((p, i) => (
                        <div
                          key={p.name}
                          className={`relative rounded-2xl border ${
                            p.wrapClass
                          } bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col ${
                            p.current ? "ring-2 ring-blue-500" : ""
                          }`}
                        >
                          {p.badge && (
                            <div className="absolute -top-3 right-4">
                              <span className="rounded-full bg-brand-100 text-brand-800 text-xs font-semibold px-3 py-1 border border-brand-200">
                                {p.badge}
                              </span>
                            </div>
                          )}
                          {p.current && (
                            <div className="absolute -top-3 left-4">
                              <span className="rounded-full bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 border border-green-200">
                                Current Plan
                              </span>
                            </div>
                          )}
                          <h4 className="text-xl font-semibold">{p.name}</h4>
                          <p className="mt-1 text-3xl font-extrabold">
                            {p.price}
                            <span className="text-base font-medium text-gray-500">
                              {p.note}
                            </span>
                          </p>
                          <p className="mt-3 text-sm text-gray-600">
                            {i === 0 && "3 requests per day"}
                            {i === 1 && "5 requests per day"}
                            {i === 2 && "500 requests per month"}
                          </p>
                          <ul className="mt-5 space-y-2 text-sm text-gray-700 flex-1">
                            {p.perks.map((perk) => (
                              <li
                                key={perk}
                                className="flex items-center gap-2"
                              >
                                <svg
                                  className="w-4 h-4 text-green-500 flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                {perk}
                              </li>
                            ))}
                          </ul>
                          <a
                            href={p.cta.href}
                            className={`mt-6 inline-flex w-full justify-center rounded-xl ${
                              p.cta.className
                            } text-white px-4 py-2.5 font-semibold ${
                              p.current ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          >
                            {p.current ? "Current Plan" : p.cta.text}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Billing History
                    </h3>
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <svg
                          className="w-12 h-12 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-500">
                        No billing history available
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === "preferences" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Display Preferences
                    </h2>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                            />
                          </svg>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Dark Mode
                            </h4>
                            <p className="text-sm text-gray-500">
                              Switch to dark theme
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          Coming Soon
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                            />
                          </svg>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Language
                            </h4>
                            <p className="text-sm text-gray-500">
                              Choose your preferred language
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          Coming Soon
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Time Zone
                            </h4>
                            <p className="text-sm text-gray-500">
                              Set your local time zone
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          Coming Soon
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Notification Preferences
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Email Notifications
                            </h4>
                            <p className="text-sm text-gray-500">
                              Receive updates via email
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          Coming Soon
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V1H4v4zM15 1v4h6V1h-6z"
                            />
                          </svg>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              Push Notifications
                            </h4>
                            <p className="text-sm text-gray-500">
                              Get real-time updates
                            </p>
                          </div>
                        </div>
                        <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          Coming Soon
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
