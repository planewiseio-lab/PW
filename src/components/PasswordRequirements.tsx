"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "@/components/LazyMotion";

interface PasswordRequirementsProps {
  password: string;
  show: boolean;
}

// Composant réutilisable pour le contenu des exigences
function RequirementsContent({
  requirements,
  allMet,
  prefix = "",
}: {
  requirements: any;
  allMet: boolean;
  prefix?: string;
}) {
  const requirementsList = [
    {
      key: `${prefix}length`,
      text: "At least 8 characters",
      met: requirements.length,
    },
    {
      key: `${prefix}uppercase`,
      text: "One uppercase letter (A-Z)",
      met: requirements.uppercase,
    },
    {
      key: `${prefix}lowercase`,
      text: "One lowercase letter (a-z)",
      met: requirements.lowercase,
    },
    {
      key: `${prefix}number`,
      text: "One number (0-9)",
      met: requirements.number,
    },
    {
      key: `${prefix}special`,
      text: "One special character (@$!%*?&)",
      met: requirements.special,
    },
  ];

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700 mb-3">
        Password Requirements:
      </div>

      {requirementsList.map((req, index) => (
        <motion.div
          key={req.key}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`flex items-center gap-2 text-sm transition-colors duration-200 ${
            req.met ? "text-green-600" : "text-gray-500"
          }`}
        >
          <motion.div
            initial={false}
            animate={{
              scale: req.met ? 1 : 0.8,
              backgroundColor: req.met ? "#10b981" : "#d1d5db",
            }}
            transition={{ duration: 0.2 }}
            className="w-4 h-4 rounded-full flex items-center justify-center"
          >
            {req.met && (
              <motion.svg
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
                className="w-2.5 h-2.5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </motion.svg>
            )}
          </motion.div>
          <span className={req.met ? "font-medium" : ""}>{req.text}</span>
        </motion.div>
      ))}

      {allMet && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3 pt-3 border-t border-gray-200"
        >
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
              className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
            >
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </motion.div>
            Password meets all requirements!
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function PasswordRequirements({
  password,
  show,
}: PasswordRequirementsProps) {
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    setRequirements({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password),
    });
  }, [password]);

  const allMet = Object.values(requirements).every(Boolean);

  if (!show) return null;

  return (
    <AnimatePresence>
      {/* Desktop version - à droite */}
      <motion.div
        key="desktop-requirements"
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="absolute top-0 left-full ml-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 w-80 hidden lg:block"
      >
        <RequirementsContent
          requirements={requirements}
          allMet={allMet}
          prefix="desktop-"
        />
      </motion.div>

      {/* Mobile version - en dessous avec espacement */}
      <motion.div
        key="mobile-requirements"
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 lg:hidden"
      >
        <RequirementsContent
          requirements={requirements}
          allMet={allMet}
          prefix="mobile-"
        />
      </motion.div>
    </AnimatePresence>
  );
}
