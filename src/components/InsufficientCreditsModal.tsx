"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  CreditCard,
  Zap,
  Star,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

interface InsufficientCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits?: number;
  plan?: string;
}

export function InsufficientCreditsModal({
  isOpen,
  onClose,
  currentCredits = 0,
  plan = "Free",
}: InsufficientCreditsModalProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isVisible) return null;

  const handleUpgrade = (planType: string) => {
    onClose();
    router.push(`/account-settings?tab=subscription&plan=${planType}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Insufficient Credits
              </h2>
              <p className="text-sm text-gray-600">
                {currentCredits} credits remaining on your {plan} plan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Status */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Current Plan: {plan}
                  </h3>
                  <p className="text-gray-600">
                    {plan === "Free"
                      ? "5 requests per day • Daily renewal"
                      : plan === "Basic"
                      ? "Up to 500 total requests / month • Monthly renewal"
                      : "Up to 2500 total requests / month • Monthly renewal"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-600">
                  {currentCredits}
                </div>
                <div className="text-sm text-gray-500">credits remaining</div>
              </div>
            </div>
          </div>

          {/* Upgrade Options */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Free Plan (Current) */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <Zap className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Free</h3>
                <div className="text-3xl font-bold text-gray-600 mb-1">$0</div>
                <div className="text-gray-500 text-sm">/mo</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Basic lookup</span>
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
              </div>

              <div className="text-center text-sm text-gray-500">
                5 requests per day
              </div>
            </div>

            {/* Basic Plan */}
            <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-300 transition-colors relative">
              <div className="absolute -top-3 right-4">
                <span className="rounded-full bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 border border-blue-200">
                  Popular
                </span>
              </div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Basic</h3>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  $9.99
                </div>
                <div className="text-gray-600 text-sm">/mo</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Everything in Free
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    7-day detailed flight history
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Detailed airport flight board
                  </span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                Up to 500 total requests / month
              </div>

              <button
                onClick={() => handleUpgrade("basic")}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Choose Basic</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Advance Plan */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                  <Star className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Advance
                </h3>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  $14.99
                </div>
                <div className="text-gray-600 text-sm">/mo</div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Everything in Basic
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Priority processing
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    Higher monthly request limit
                  </span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                Up to 2500 total requests / month
              </div>

              <button
                onClick={() => handleUpgrade("advance")}
                className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-semibold hover:bg-black transition-colors flex items-center justify-center space-x-2"
              >
                <span>Choose Advance</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Why upgrade to a paid plan?
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mb-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  More Requests
                </h4>
                <p className="text-sm text-gray-600">
                  Up to 2500 requests per month
                </p>
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mb-2">
                  <Star className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Advanced Features
                </h4>
                <p className="text-sm text-gray-600">
                  Access to all premium features
                </p>
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Priority Support
                </h4>
                <p className="text-sm text-gray-600">
                  Dedicated 24/7 assistance
                </p>
              </div>
            </div>
          </div>

          {/* Alternative Actions */}
          <div className="text-center">
            <p className="text-gray-600 mb-4 text-sm">
              Not ready to upgrade?{" "}
              {plan === "Free"
                ? "Your free credits renew tomorrow."
                : "Your credits renew next month."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Continue later
              </button>
              <button
                onClick={() => router.push("/account-settings")}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Manage Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
