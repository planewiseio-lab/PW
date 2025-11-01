import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CreditCard, Zap, Star, CheckCircle } from "lucide-react";

export default function InsufficientCreditsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
              <CreditCard className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Insufficient Credits
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              You've used all your free credits. Upgrade to a paid plan to
              continue exploring aviation data without limits!
            </p>
          </div>

          {/* Current Status */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Current Plan: Free
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
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-200 hover:shadow-xl transition-shadow relative flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Star className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Free
                </h3>
                <div className="text-4xl font-bold text-blue-600 mb-2">$0</div>
                <div className="text-gray-600">/mo</div>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Aircraft lookup</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Flight history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Airport information</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Basic specs & photos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Community support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Ads</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                5 requests per day
              </div>

              <Link
                href="/auth?mode=register"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Get started</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Basic Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 hover:shadow-xl transition-shadow flex flex-col">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Star className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  $5.99
                </div>
                <div className="text-gray-600">/mo</div>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Aircraft lookup</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Flight history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Airport information</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Basic specs & photos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Community support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Ads</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                350 credits per month
              </div>

              <Link
                href="/checkout?plan=basic"
                className="w-full bg-gray-900 text-white py-3 px-6 rounded-xl font-semibold hover:bg-black transition-colors flex items-center justify-center space-x-2"
              >
                <span>Choose Basic</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-200 hover:shadow-xl transition-shadow relative flex flex-col">
              <div className="absolute -top-3 right-4">
                <span className="rounded-full bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 border border-blue-200">
                  Popular
                </span>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="absolute -top-3 left-4 z-10"
              >
                <span className="inline-block px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse shadow-lg">
                  SAVE 23%
                </span>
              </motion.div>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Star className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="mb-2 relative">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-xl font-medium text-gray-400 line-through relative mb-2"
                  >
                    $12.99
                    <motion.span
                      animate={{
                        scale: [1, 1.05, 1],
                        opacity: [0.5, 0.8, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute left-0 right-0 top-0 bottom-0 bg-gradient-to-r from-transparent via-red-200/30 to-transparent"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-4xl font-bold text-blue-600 mb-2 relative inline-block"
                  >
                    <motion.span
                      animate={{
                        boxShadow: [
                          "0 0 0px rgba(37, 99, 235, 0)",
                          "0 0 25px rgba(37, 99, 235, 0.5)",
                          "0 0 0px rgba(37, 99, 235, 0)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-lg blur-sm"
                    />
                    <span className="relative z-10">$9.99</span>
                  </motion.div>
                </div>
                <div className="text-gray-600">/mo</div>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Aircraft lookup</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Flight history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Airport information</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Basic specs & photos</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Community support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Priority processing</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500 mb-4">
                750 requests per month
              </div>

              <Link
                href="/checkout?plan=pro"
                className="w-full bg-gray-900 text-white py-3 px-6 rounded-xl font-semibold hover:bg-black transition-colors flex items-center justify-center space-x-2"
              >
                <span>Choose Pro</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                Why upgrade to a paid plan?
              </h2>
              <p className="text-xl text-blue-100">
                Unlock the full potential of PlaneWise with our premium plans
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">More Requests</h3>
                <p className="text-blue-100">
                  Up to 750 requests per month to explore without limits
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
                  <Star className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Advanced Features
                </h3>
                <p className="text-blue-100">
                  Access to all premium features and API
                </p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Priority Support</h3>
                <p className="text-blue-100">
                  Dedicated assistance and 24/7 technical support
                </p>
              </div>
            </div>
          </div>

          {/* Alternative Actions */}
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Not ready to upgrade? Your free credits renew tomorrow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Return to Dashboard
              </Link>
              <Link
                href="/account-settings"
                className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                Manage Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
