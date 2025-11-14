import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - PlaneWise",
  description:
    "Learn about credit usage and refund policy for PlaneWise aviation data platform.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://plane-wise.com/about-us",
  },
};

export default function AboutUsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">About Us</h1>

      <div className="prose prose-lg max-w-none">
        {/* Section 1: Credit Usage */}
        <section id="credit-usage" className="mb-12 scroll-mt-20">
          <h2 className="text-2xl font-semibold mb-4">1. Credit Usage</h2>
          <div className="space-y-4">
            <p>
              Welcome to PlaneWise! When you purchase a plan, you receive a set
              number of credits that allow you to access our aviation data
              services. Credits are used based on the complexity and type of
              your requests.
            </p>

            <div>
              <h3 className="text-xl font-semibold mb-3">
                Here's how credits are deducted:
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>1 credit:</strong> For each detailed aircraft search.
                </li>
                <li>
                  <strong>2 credits:</strong> For each flight search, whether it
                  returns information or is invalid.
                </li>
                <li>
                  <strong>2 credits:</strong> For each Flight Board Arrivals and
                  departures.
                </li>
                <li>
                  <strong>2 credits:</strong> For each plane status update in
                  the dashboard.
                </li>
                <li>
                  <strong>4 credits:</strong> For each flight history request of
                  an aircraft covering a 14-day period.
                </li>
                <li>
                  <strong>0 credits:</strong> For images displayed during an
                  aircraft search.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">
                Tips for managing your credits:
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Plan your searches carefully to maximize usage.</li>
                <li>Remember that complex searches consume more credits.</li>
                <li>
                  Your remaining credits are displayed in your account dashboard
                  for easy tracking.
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Contact Us</h3>
              <p className="mb-4">
                If you have any questions or need assistance with your credits,
                please contact us at:
              </p>
              <p>
                📧{" "}
                <a
                  href="mailto:info@planewise.io"
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  info@planewise.io
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Séparateur entre les sections */}
        <div className="border-t border-gray-300 my-12"></div>

        {/* Section 2: Refund Policy */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Refund Policy</h2>
          <p className="text-gray-600 mb-8">Last updated: November 3, 2025</p>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-4">1. Overview</h3>
              <p className="mb-4">
                At PlaneWise, we strive to provide a reliable and transparent
                aviation data service. This Refund Policy explains the terms
                under which payments may be refunded.
              </p>
              <p>
                By purchasing or subscribing to any paid service offered by
                PlaneWise ("the Service"), you agree to the terms of this Refund
                Policy.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">
                2. Free and Trial Plans
              </h3>
              <p className="mb-4">
                If a free or trial version of PlaneWise is offered, no payment
                information is collected until you choose to upgrade to a paid
                plan.
              </p>
              <p>No refunds apply to free or trial usage.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">3. Paid Plans</h3>
              <p className="mb-4">
                Payments for subscriptions or credits made through PlaneWise are
                generally non-refundable, except in the following cases:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Duplicate payments caused by a billing error;</li>
                <li>
                  Technical issues that prevent you from accessing the paid
                  features after purchase;
                </li>
                <li>
                  Unauthorized or fraudulent transactions verified by our
                  payment processor.
                </li>
              </ul>
              <p>
                If one of these situations applies, you may request a refund
                within 7 days of the original payment.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">
                4. Refund Request Procedure
              </h3>
              <p className="mb-4">To request a refund:</p>
              <ol className="list-decimal pl-6 mb-4 space-y-2">
                <li>
                  Send an email to{" "}
                  <a
                    href="mailto:info@planewise.io"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    info@planewise.io
                  </a>{" "}
                  with the subject line "Refund Request";
                </li>
                <li>
                  Include your transaction ID, payment date, and the reason for
                  your request;
                </li>
                <li>
                  Our team will review your request within 5 business days and
                  respond with the outcome.
                </li>
              </ol>
              <p>
                Approved refunds will be issued to the original payment method
                used at checkout.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">
                5. Subscription Cancellations
              </h3>
              <p className="mb-4">
                You may cancel your subscription at any time. Cancellation
                prevents future renewals but does not automatically trigger a
                refund for the current billing period.
              </p>
              <p>
                To avoid being charged for the next cycle, cancellations must be
                submitted at least 24 hours before renewal.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">
                6. Changes to This Policy
              </h3>
              <p>
                PlaneWise reserves the right to update or modify this Refund
                Policy at any time. The latest version will always be available
                on this page.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">Contact Us</h3>
              <p className="mb-4">
                If you have any questions about this Refund Policy, please
                contact us at:
              </p>
              <p>
                📧{" "}
                <a
                  href="mailto:info@planewise.io"
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  info@planewise.io
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Séparateur entre les sections */}
        <div className="border-t border-gray-300 my-12"></div>

        {/* Section 3: Security */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">3. Security</h2>
          <div className="space-y-4">
            <p>
              At PlaneWise, we take the security of your data seriously. Our
              platform is designed to protect your information through multiple
              layers of technical and organizational measures.
            </p>

            <div>
              <h3 className="text-xl font-semibold mb-3">
                How we protect your data:
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Encrypted connections:</strong> All data transmitted
                  between your device and PlaneWise is encrypted using
                  HTTPS/TLS.
                </li>
                <li>
                  <strong>Secure storage:</strong> User data is stored securely
                  in Supabase, with access controls and regular backups.
                </li>
                <li>
                  <strong>Access management:</strong> Only authorized personnel
                  can access sensitive data, and all access is logged and
                  monitored.
                </li>
                <li>
                  <strong>Regular updates and monitoring:</strong> Our systems
                  are continuously updated and monitored to prevent unauthorized
                  access, vulnerabilities, or breaches.
                </li>
              </ul>
            </div>

            <p>
              We continuously review and improve our security practices to
              ensure your data is safe while using PlaneWise.
            </p>

            <div>
              <h3 className="text-xl font-semibold mb-3">Contact Us</h3>
              <p className="mb-4">
                If you have any questions or concerns about the security of your
                data, please contact us at:
              </p>
              <p>
                📧{" "}
                <a
                  href="mailto:info@planewise.io"
                  className="text-blue-600 hover:text-blue-700 underline font-medium"
                >
                  info@planewise.io
                </a>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
