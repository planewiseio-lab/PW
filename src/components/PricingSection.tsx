"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// Hook pour détecter mobile et réduire les animations
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

export default function PricingSection() {
  const isMobile = useIsMobile();

  return (
    <section id="pricing" className="section-fade">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mb-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Pricing
          </h2>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            Simple plans with fair limits. Start free and upgrade anytime.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              name: "Free",
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
                href: "/auth?mode=register",
                text: "Get started",
                className: "bg-gray-900 hover:bg-black",
              },
              wrapClass: "border-gray-200",
            } as const,
            {
              name: "Basic",
              price: "$5.99",
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
                href: "/checkout?plan=basic",
                text: "Choose Basic",
                className: "bg-gray-900 hover:bg-black",
              },
              wrapClass: "border-gray-200",
            } as const,
            {
              name: "Pro",
              price: "$9.99",
              oldPrice: "$12.99",
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
                className: "bg-blue-600 hover:bg-blue-700",
              },
              wrapClass: "border-gray-200",
            } as const,
          ].map((p, i) => (
            <motion.article
              key={p.name}
              whileHover={isMobile ? {} : { scale: 1.02, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`relative rounded-2xl border ${p.wrapClass} bg-white p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-150 flex flex-col cursor-pointer`}
            >
              {p.oldPrice && (
                <motion.div
                  initial={
                    isMobile ? { opacity: 1 } : { opacity: 0, scale: 0.8 }
                  }
                  animate={isMobile ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  transition={isMobile ? {} : { duration: 0.5, delay: 0.2 }}
                  className="absolute -top-3 left-4 z-10"
                >
                  <span className="inline-block px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                    SAVE 23%
                  </span>
                </motion.div>
              )}
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <div className="mt-1 relative">
                {p.oldPrice ? (
                  <div className="flex items-baseline gap-3">
                    <motion.p
                      initial={
                        isMobile ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }
                      }
                      animate={
                        isMobile ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }
                      }
                      transition={isMobile ? {} : { duration: 0.5, delay: 0.1 }}
                      className="text-lg font-medium text-gray-400 line-through relative"
                    >
                      {p.oldPrice}
                      {!isMobile && (
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
                      )}
                    </motion.p>
                    <motion.p
                      initial={
                        isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }
                      }
                      animate={
                        isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }
                      }
                      transition={isMobile ? {} : { duration: 0.5, delay: 0.2 }}
                      className="text-3xl font-extrabold relative inline-block"
                    >
                      <span className="relative z-10">{p.price}</span>
                      <span className="text-base font-medium text-gray-500">
                        {p.note}
                      </span>
                    </motion.p>
                  </div>
                ) : (
                  <motion.p
                    initial={
                      isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }
                    }
                    animate={
                      isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }
                    }
                    transition={isMobile ? {} : { duration: 0.5, delay: 0.1 }}
                    className="text-3xl font-extrabold relative inline-block"
                  >
                    <span className="relative z-10">{p.price}</span>
                    <span className="text-base font-medium text-gray-500">
                      {p.note}
                    </span>
                  </motion.p>
                )}
              </div>
              <p className="mt-3 text-sm text-gray-600">
                {i === 0 && "50 credits per month"}
                {i === 1 && "350 credits per month"}
                {i === 2 && "750 credits per month"}
              </p>
              <ul className="mt-5 space-y-2 text-sm text-gray-700 flex-1">
                {p.perks.map((perk) => (
                  <li key={perk}>• {perk}</li>
                ))}
              </ul>
              <a
                href={p.cta.href}
                className={`mt-6 inline-flex w-full justify-center rounded-xl ${p.cta.className} text-white px-4 py-2.5 font-semibold`}
              >
                {p.cta.text}
              </a>
            </motion.article>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          All prices in USD. Request counts reset monthly.
        </p>
      </div>
    </section>
  );
}
