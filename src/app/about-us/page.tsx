import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - PlaneWise",
  description:
    "Learn about credit usage and security for PlaneWise aviation data platform.",
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

        {/* Section 2: Refund Policy - Link to dedicated page */}
        <section id="refund-policy" className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Refund Policy</h2>
          <p className="mb-4">
            For detailed information about our refund policy, please visit our dedicated{" "}
            <a
              href="/refund-policy"
              className="text-blue-600 hover:text-blue-700 underline font-medium"
            >
              Refund Policy page
            </a>
            .
          </p>
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
