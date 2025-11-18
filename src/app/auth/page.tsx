"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "@/components/LazyMotion";
import Link from "next/link";
import Image from "next/image";
import PasswordRequirements from "@/components/PasswordRequirements";

type AuthMode = "login" | "register";

function AuthPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Determine initial mode from URL
  const initialMode = (() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get("mode");
      return (modeParam === "register" ? "register" : "login") as AuthMode;
    }
    return "login" as AuthMode;
  })();

  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [existingAccount, setExistingAccount] = useState<{
    userId: string;
    email: string;
    createdAt: string;
    canRecover: boolean;
  } | null>(null);

  const supabase = createClient();

  // Google Auth handlers
  const handleGoogleLogin = useCallback(
    async (response: any) => {
      setLoading(true);
      setMessage("");

      try {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
        });

        if (error) throw error;

        setMessage("Login successful! Redirecting...");
        setShowSuccess(true);

        const redirectUrl = searchParams.get("redirect") || "/dashboard";
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1500);
      } catch (error: any) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    },
    [supabase, searchParams, router]
  );

  const handleGoogleRegister = useCallback(
    async (response: any) => {
      setLoading(true);
      setMessage("");

      try {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
        });

        if (error) throw error;

        setMessage("Registration successful! Redirecting...");
        setShowSuccess(true);

        const redirectUrl = searchParams.get("redirect") || "/dashboard";
        setTimeout(() => {
          router.push(redirectUrl);
        }, 1500);
      } catch (error: any) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    },
    [supabase, searchParams, router]
  );

  // Update mode if URL parameter changes
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "register") {
      setMode("register");
    } else if (modeParam === "login") {
      setMode("login");
    }
    // If no mode parameter, keep initial mode
  }, [searchParams]);

  // Load Google script and initialize button
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.warn(
        "Google Client ID not found. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your .env.local"
      );
      return;
    }

    // Log the client ID being used (for debugging)
    console.log("Using Google Client ID:", clientId);

    let checkInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const initializeGoogleButton = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        return false;
      }

      const buttonId =
        mode === "login" ? "google-signin-button" : "google-register-button";
      const buttonElement = document.getElementById(buttonId);

      if (!buttonElement) {
        return false;
      }

      // Initialize Google Identity Services
      const callback =
        mode === "login" ? handleGoogleLogin : handleGoogleRegister;

      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: callback,
        });

        // Create hidden Google button and custom styled button
        buttonElement.innerHTML = "";

        // Create hidden div for Google's button
        const hiddenButtonContainer = document.createElement("div");
        hiddenButtonContainer.id = `hidden-google-button-${mode}`;
        hiddenButtonContainer.style.display = "none";

        // Render Google's button in hidden container
        google.accounts.id.renderButton(hiddenButtonContainer, {
          theme: "outline",
          size: "large",
          text: mode === "login" ? "signin_with" : "signup_with",
          shape: "pill",
          logo_alignment: "left",
        });

        // Create custom styled button
        const customButton = document.createElement("button");
        customButton.type = "button";
        customButton.className =
          "group relative w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm";
        customButton.disabled = loading;

        // Google logo SVG
        const googleLogo = `
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" fill-rule="evenodd">
              <path d="M17.64 9.2045c0-.6371-.0573-1.2516-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7955 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.0364-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
              <path d="M3.9636 10.71c-.18-.54-.2822-1.1173-.2822-1.71s.1023-1.17.2823-1.71L.9573 4.9582C.3477 6.1731 0 7.5477 0 9s.3486 2.8269.9573 4.0418l3.0063-2.3318z" fill="#FBBC05"/>
              <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.4236 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9636 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
            </g>
          </svg>
        `;

        customButton.innerHTML = `
          ${googleLogo}
          <span>Continue with Google</span>
        `;

        // Add click handler to trigger hidden Google button
        customButton.onclick = () => {
          if (loading) return;
          // Find and click the actual Google button
          const hiddenButton = hiddenButtonContainer.querySelector(
            'div[role="button"]'
          ) as HTMLElement;
          if (hiddenButton) {
            hiddenButton.click();
          }
        };

        buttonElement.appendChild(hiddenButtonContainer);
        buttonElement.appendChild(customButton);

        // Store reference to update disabled state
        (buttonElement as any).customButton = customButton;

        return true;
      } catch (error) {
        console.error("Error initializing Google button:", error);
        return false;
      }
    };

    const startChecking = () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Try immediately first
      if (initializeGoogleButton()) {
        return;
      }

      // If not successful, start polling
      checkInterval = setInterval(() => {
        if (initializeGoogleButton()) {
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
        }
      }, 200);

      // Stop trying after 10 seconds
      timeoutId = setTimeout(() => {
        if (checkInterval) {
          clearInterval(checkInterval);
          checkInterval = null;
        }
        // Log if button still not found
        const buttonId =
          mode === "login" ? "google-signin-button" : "google-register-button";
        const buttonElement = document.getElementById(buttonId);
        if (!buttonElement) {
          console.warn(
            `Google button container "${buttonId}" not found in DOM`
          );
        }
      }, 10000);
    };

    // Wait a bit for the form to be mounted (especially with AnimatePresence)
    const delayedStart = () => {
      setTimeout(() => {
        startChecking();
      }, 300);
    };

    // Check if script is already loaded
    if ((window as any).google?.accounts?.id) {
      // Script already loaded, try to initialize after a short delay
      delayedStart();
      return () => {
        if (checkInterval) clearInterval(checkInterval);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    // Script not loaded, check if script tag exists
    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existingScript) {
      // Script tag exists, wait for it to load
      const existingScriptOnLoad = () => {
        if ((window as any).google?.accounts?.id) {
          delayedStart();
        } else {
          // Poll until script is loaded
          const pollInterval = setInterval(() => {
            if ((window as any).google?.accounts?.id) {
              clearInterval(pollInterval);
              delayedStart();
            }
          }, 100);
          setTimeout(() => clearInterval(pollInterval), 5000);
        }
      };

      // Check if script is already loaded
      if ((existingScript as HTMLScriptElement).onload === null) {
        existingScriptOnLoad();
      } else {
        (existingScript as HTMLScriptElement).addEventListener(
          "load",
          existingScriptOnLoad
        );
      }

      return () => {
        if (checkInterval) clearInterval(checkInterval);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    // Create and load script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Wait for DOM to be ready and button to exist
      delayedStart();
    };

    script.onerror = () => {
      console.error("Failed to load Google Sign-In script");
    };

    document.head.appendChild(script);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [mode, handleGoogleLogin, handleGoogleRegister]);

  // Update custom button disabled state when loading changes
  useEffect(() => {
    const buttonId =
      mode === "login" ? "google-signin-button" : "google-register-button";
    const buttonElement = document.getElementById(buttonId);
    if (buttonElement && (buttonElement as any).customButton) {
      (buttonElement as any).customButton.disabled = loading;
    }
  }, [loading, mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setMessage("Login successful! Redirecting...");
      setShowSuccess(true);

      // Redirect to dashboard or redirect URL
      const redirectUrl = searchParams.get("redirect") || "/dashboard";
      setTimeout(() => {
        router.push(redirectUrl);
      }, 1500);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Validation
    if (!fullName.trim()) {
      setMessage("Full name is required");
      setLoading(false);
      return;
    }

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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if existing account was detected
        if (data.error === "EXISTING_ACCOUNT_FOUND" && data.existingAccount) {
          setExistingAccount(data.existingAccount);
          setMessage(
            data.message || "An account already exists from this IP address."
          );
          return;
        }
        throw new Error(data.error || "An error occurred during signup");
      }

      setMessage(
        "Account created successfully! Check your email for the confirmation link."
      );
      setShowSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        setMode("login");
        setShowSuccess(false);
        setMessage("");
      }, 3000);
    } catch (error: any) {
      setMessage(error.message || "An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverAccount = async () => {
    if (!existingAccount) return;

    setLoading(true);
    setMessage("");

    try {
      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(
        existingAccount.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (error) throw error;

      setMessage(
        `A password reset email has been sent to ${existingAccount.email}. Please check your inbox.`
      );
      setExistingAccount(null);
    } catch (error: any) {
      setMessage(
        error.message || "An error occurred while sending recovery email"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContactUs = () => {
    router.push("/contact");
  };

  // Function to mask email for privacy
  const maskEmail = (email: string): string => {
    const [localPart, domain] = email.split("@");
    if (!localPart || !domain) return email;

    // Mask local part: keep first 2 chars, mask the rest
    const maskedLocal =
      localPart.length <= 2 ? localPart : localPart.substring(0, 2) + "***";

    // Mask domain: keep first 4 chars before the dot, mask the rest
    const [domainName, extension] = domain.split(".");
    if (!domainName || !extension) return email;

    const maskedDomain =
      domainName.length <= 4
        ? domainName.substring(0, 2) + "***"
        : domainName.substring(0, 4) + "***";

    return `${maskedLocal}@${maskedDomain}.${extension}`;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setMessage("Check your email for the password reset link!");
      setShowForgotPassword(false);
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Logo en haut */}
          <div className="text-center mb-8">
            <Link href="/" className="flex flex-col items-center gap-2">
              <Image
                src="/Assets/logo.webp"
                alt="PlaneWise Logo"
                width={80}
                height={80}
                className="h-16 w-16 sm:h-20 sm:w-20 object-contain"
                priority
              />
              <span className="text-2xl sm:text-3xl font-bold text-[#178cf2]">
                PlaneWise.io
              </span>
            </Link>
          </div>

          {/* Section fixe en haut */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-gray-600">
              Get started with PlaneWise today
            </p>

            {/* Menu de navigation centré sous le texte de bienvenue */}
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 mt-6 mb-8">
              <button
                onClick={() => {
                  setMode("login");
                  setMessage("");
                  setShowSuccess(false);
                }}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === "login"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMode("register");
                  setMessage("");
                  setShowSuccess(false);
                }}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === "register"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Contenu dynamique sous le menu - hauteur fixe pour éviter le déplacement */}
          <div className="h-[650px] relative">
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-full max-w-sm mx-auto text-center space-y-6">
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
                            className="w-10 h-10 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
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

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="space-y-2"
                    >
                      <h3 className="text-2xl font-bold text-gray-900">
                        {mode === "login"
                          ? "Welcome back!"
                          : "Account created!"}
                      </h3>
                      <p className="text-gray-600 text-base leading-relaxed">
                        {message.includes("Redirecting")
                          ? "Login successful! You'll be redirected shortly..."
                          : message.includes("Account created") ||
                            message.includes("Check your email")
                          ? "Please check your email to confirm your account. You'll be redirected to login shortly."
                          : message}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex justify-center items-center gap-2 pt-4"
                    >
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
                      <span className="text-sm text-gray-500">
                        {message.includes("Redirecting")
                          ? "Redirecting..."
                          : message.includes("Account created") ||
                            message.includes("Check your email")
                          ? "Redirecting to login..."
                          : "Please wait..."}
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              ) : (
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={mode === "login" ? handleLogin : handleRegister}
                  className="space-y-6 flex flex-col"
                >
                  <div className="space-y-4">
                    {mode === "register" && (
                      <div>
                        <label
                          htmlFor="fullName"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Full Name
                        </label>
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:z-10 sm:text-sm"
                          placeholder="Enter your full name"
                        />
                      </div>
                    )}

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:z-10 sm:text-sm"
                        placeholder="Enter your email"
                      />
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label
                          htmlFor="password"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Password
                        </label>
                        {mode === "login" && (
                          <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-sm text-[#178cf2] hover:text-blue-500 transition"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() =>
                          mode === "register" &&
                          setShowPasswordRequirements(true)
                        }
                        onBlur={() =>
                          mode === "register" &&
                          setShowPasswordRequirements(false)
                        }
                        className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:z-10 sm:text-sm"
                        placeholder={
                          mode === "login"
                            ? "Enter your password"
                            : "Create a password"
                        }
                      />
                      {mode === "register" && (
                        <PasswordRequirements
                          password={password}
                          show={showPasswordRequirements}
                        />
                      )}
                    </div>

                    {mode === "register" && (
                      <div>
                        <label
                          htmlFor="confirmPassword"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Confirm Password
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
                          placeholder="Confirm your password"
                        />
                      </div>
                    )}
                  </div>

                  {existingAccount && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-yellow-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                        </div>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Existing Account Detected
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              An account was created from this IP address on{" "}
                              {new Date(
                                existingAccount.createdAt
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                              .
                            </p>
                            <p className="mt-1">
                              Account email:{" "}
                              <span className="font-semibold">
                                {maskEmail(existingAccount.email)}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <button
                          type="button"
                          onClick={handleRecoverAccount}
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Recover My Account
                        </button>
                        <button
                          type="button"
                          onClick={handleContactUs}
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Contact Us
                        </button>
                      </div>
                    </div>
                  )}

                  {message && !existingAccount && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`text-sm p-3 rounded-lg ${
                        message.includes("Check your email") ||
                        message.includes("successful") ||
                        message.includes("envoyé")
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {message}
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#178cf2] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          {mode === "login"
                            ? "Signing in..."
                            : "Creating account..."}
                        </div>
                      ) : mode === "login" ? (
                        "Sign in"
                      ) : (
                        "Create account"
                      )}
                    </button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300" />
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <div
                      id={
                        mode === "login"
                          ? "google-signin-button"
                          : "google-register-button"
                      }
                      className="w-full flex justify-center min-h-[48px]"
                      style={{ minHeight: "48px" }}
                    ></div>

                    {mode === "register" && (
                      <p className="text-xs text-gray-500 text-center">
                        By creating an account, you agree to our{" "}
                        <Link
                          href="/terms"
                          className="text-[#178cf2] hover:underline"
                        >
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                          href="/privacy"
                          className="text-[#178cf2] hover:underline"
                        >
                          Privacy Policy
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Modal Forgot Password */}
        <AnimatePresence>
          {showForgotPassword && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setShowForgotPassword(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl"
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Reset Password
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Enter your email address and we'll send you a link to reset
                    your password.
                  </p>

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label
                        htmlFor="reset-email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Email address
                      </label>
                      <input
                        id="reset-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your email"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#178cf2] hover:brightness-110 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? "Sending..." : "Send Reset Link"}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
