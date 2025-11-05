"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { validateUser } from "@/lib/auth-utils";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // Vérifier si Supabase est configuré
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const isSupabaseConfigured =
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://your-project.supabase.co" &&
    supabaseAnonKey !== "your-anon-key-here";

  const supabase = isSupabaseConfigured ? createClient() : null;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    const getUser = async () => {
      try {
        const user = await validateUser();
        setUser(user);
        setLoading(false);
      } catch (err) {
        console.error("Error getting user:", err);
        setUser(null);
        setLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isSupabaseConfigured, supabase]);

  // Si Supabase n'est pas configuré, afficher un message
  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-full bg-yellow-100 text-yellow-800 px-4 py-1.5 text-sm font-semibold">
        Auth Disabled
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-semibold animate-pulse">
        Loading...
      </div>
    );
  }

  if (user) {
    // Récupérer le nom complet depuis les métadonnées utilisateur
    const fullName =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

    // Vérifier si l'utilisateur est admin
    const isAdmin =
      user.user_metadata?.role === "admin" ||
      user.app_metadata?.role === "admin";

    const handleLogout = () => {
      window.dispatchEvent(new CustomEvent("request-logout"));
      setShowMenu(false);
    };

    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{fullName}</span>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="group relative flex items-center justify-center min-w-[44px] min-h-[44px] w-10 h-10 rounded-full bg-[#178cf2] text-white shadow hover:brightness-110 transition-all duration-200 hover:scale-105"
            aria-label="User menu"
            aria-expanded={showMenu}
            aria-haspopup="true"
          >
            <svg
              className="w-5 h-5 transition-transform group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </button>

          {/* Menu déroulant */}
          <AnimatePresence>
            {showMenu && (
              <>
                {/* Overlay pour fermer le menu */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20"
                >
                  <div className="py-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowMenu(false)}
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
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                      Dashboard
                    </Link>

                    <Link
                      href="/credits"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowMenu(false)}
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
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Credits
                    </Link>

                    {/* Séparation principale - Menu Utilisateur */}
                    <div className="border-t-2 border-gray-200 my-2" />

                    {/* Menu Admin - affiché seulement pour les admins */}
                    {isAdmin && (
                      <>
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500 mx-2 mb-2 rounded-r">
                          <div className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-purple-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                              </svg>
                              <div className="text-xs font-bold text-purple-700 uppercase tracking-wider">
                                Admin Panel
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="px-2 pb-2 mb-2 bg-gray-50 rounded-lg mx-2">
                          <Link
                            href="/admin/credits"
                            className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-purple-50 transition-colors"
                            onClick={() => setShowMenu(false)}
                          >
                            <svg
                              className="w-5 h-5 mt-0.5 text-purple-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                              />
                            </svg>
                            <div className="min-w-0">
                              <div className="text-sm text-gray-800 leading-5">
                                Credit Management
                              </div>
                            </div>
                          </Link>
                          <Link
                            href="/admin/usage"
                            className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-purple-50 transition-colors"
                            onClick={() => setShowMenu(false)}
                          >
                            <svg
                              className="w-4 h-4 mt-0.5 text-purple-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                            <div className="min-w-0">
                              <div className="text-sm text-gray-800 leading-5">
                                Usage Analytics
                              </div>
                            </div>
                          </Link>
                        </div>
                        {/* Séparation entre Admin et Account Settings */}
                        <div className="border-t-2 border-gray-200 my-2" />
                      </>
                    )}
                    <Link
                      href="/account-settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      onClick={() => setShowMenu(false)}
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
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Account Settings
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
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
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Logout
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/auth"
      className="inline-flex items-center justify-center rounded-lg bg-[#178cf2] hover:brightness-110 text-white px-6 py-2.5 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
    >
      Login / Register
    </Link>
  );
}
