"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  Zap,
  Star,
  CheckCircle,
  X,
} from "lucide-react";

export function SubscribedCreditsExceededModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState(0);

  useEffect(() => {
    const handleCreditsExceeded = (event: CustomEvent) => {
      setCreditsRemaining(event.detail?.creditsRemaining || 0);
      setIsOpen(true);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "subscribedCreditsExceeded",
      handleCreditsExceeded as EventListener
    );
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "subscribedCreditsExceeded",
        handleCreditsExceeded as EventListener
      );
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Header */}
        <div className="text-center p-8 border-b border-gray-200">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-full mb-6">
            <Zap className="w-10 h-10 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Daily Credits Exhausted
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            You've used all your 5 daily credits. Upgrade to Pro plan for 500
            monthly credits and unlimited access!
          </p>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Current Plan: Subscribed
                </h3>
                <p className="text-gray-600">
                  5 requests per day • Daily renewal
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-red-600">0</div>
              <div className="text-sm text-gray-500">credits remaining</div>
            </div>
          </div>
        </div>

        {/* Upgrade Options */}
        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Subscribed Plan (Current) */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Subscribed
                </h3>
                <div className="text-3xl font-bold text-blue-600 mb-1">$0</div>
                <div className="text-gray-600 text-sm">/mo</div>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Aircraft lookup</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Flight history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Airport information
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Basic specs & photos
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Community support
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Ads</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                5 requests per day
              </div>

              <div className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-semibold flex items-center justify-center space-x-2 cursor-not-allowed">
                <span>Current Plan</span>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-300 transition-colors relative flex flex-col">
              <div className="absolute -top-3 right-4">
                <span className="rounded-full bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 border border-blue-200">
                  Popular
                </span>
              </div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  $9.99
                </div>
                <div className="text-gray-600 text-sm">/mo</div>
              </div>

              <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Aircraft lookup</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Flight history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Airport information
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Basic specs & photos
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Community support
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Priority processing
                  </span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                500 requests per month
              </div>

              <Link
                href="/checkout?plan=pro"
                onClick={handleClose}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Choose Pro</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
            <h3 className="text-2xl font-bold mb-4 text-center">
              Why Upgrade to Pro?
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-3">
                  <Zap className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">100x More Credits</h4>
                <p className="text-sm opacity-90">
                  From 5 daily to 500 monthly credits
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-3">
                  <Star className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">Priority Processing</h4>
                <p className="text-sm opacity-90">
                  Faster response times for all requests
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="font-semibold mb-2">No Daily Limits</h4>
                <p className="text-sm opacity-90">
                  Use all 500 credits whenever you need
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Your credits will reset tomorrow. Upgrade now for unlimited
              access!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                onClick={handleClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-center"
              >
                Wait for Tomorrow
              </Link>
              <Link
                href="/checkout?plan=pro"
                onClick={handleClose}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Upgrade to Pro</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
