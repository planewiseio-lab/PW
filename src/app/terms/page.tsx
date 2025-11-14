import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - PlaneWise",
  description:
    "PlaneWise terms of service and usage agreement. Read our terms before using our aviation data platform.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://plane-wise.com/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-8">Last updated: November 3, 2025</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using PlaneWise ("the Service"), you agree to be
            bound by these Terms of Service ("Terms"). If you do not agree with
            any part of these Terms, you must not use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">2. Definitions</h2>
          <p className="mb-4">
            "PlaneWise", "we", "our", or "us" refers to the operators and
            maintainers of the PlaneWise platform and related services.
          </p>
          <p>
            "User", "you", or "your" refers to any person or entity accessing
            or using the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            3. Modifications to These Terms
          </h2>
          <p>
            PlaneWise reserves the right to modify or update these Terms at any
            time without prior notice. The most recent version will always be
            available on this page with the latest revision date indicated
            above. Continued use of the Service after any update constitutes
            acceptance of the revised Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">4. Use License</h2>
          <p className="mb-4">
            Permission is granted to temporarily access and use PlaneWise for
            personal, non-commercial purposes only. This license does not
            transfer ownership.
          </p>
          <p className="mb-4">Under this license, you may not:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Copy, distribute, or resell data obtained from PlaneWise;</li>
            <li>
              Use automated scripts, bots, or scraping tools to collect data;
            </li>
            <li>
              Reverse-engineer, modify, or reproduce any part of the Service;
            </li>
            <li>
              Use the Service for unlawful, misleading, or abusive purposes.
            </li>
          </ul>
          <p>
            Violation of these restrictions may result in immediate suspension
            or termination of access.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            5. Intellectual Property
          </h2>
          <p className="mb-4">
            All trademarks, logos, and materials displayed on PlaneWise are the
            property of PlaneWise or their respective owners.
          </p>
          <p>
            You may not reproduce, use, or distribute these materials without
            prior written authorization.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            6. Third-Party Data and APIs
          </h2>
          <p className="mb-4">
            PlaneWise integrates aviation data provided by external services,
            including AeroDataBox.
          </p>
          <p className="mb-4">
            We make no guarantees regarding the accuracy, completeness, or
            availability of third-party data.
          </p>
          <p>
            PlaneWise is not responsible for any errors, interruptions, or
            delays originating from third-party sources or APIs.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Disclaimer</h2>
          <p className="mb-4">
            All information and services provided by PlaneWise are offered on
            an "as is" and "as available" basis.
          </p>
          <p>
            To the fullest extent permitted by law, PlaneWise disclaims all
            warranties, whether express or implied, including but not limited
            to fitness for a particular purpose, reliability, or
            non-infringement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            8. Limitation of Liability
          </h2>
          <p className="mb-4">
            In no event shall PlaneWise, its contributors, or suppliers be
            liable for any indirect, incidental, special, consequential, or
            exemplary damages arising from the use or inability to use the
            Service — even if advised of the possibility of such damages.
          </p>
          <p>
            Your sole remedy for dissatisfaction with the Service is to
            discontinue its use.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
          <p>
            PlaneWise reserves the right to suspend or terminate access to the
            Service at any time, without notice, for any reason, including but
            not limited to misuse or violation of these Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">10. Governing Law</h2>
          <p>
            These Terms shall be governed by and interpreted in accordance with
            applicable international laws and general principles of fair use.
            Any disputes shall be resolved through amicable negotiation before
            pursuing any legal remedies.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">11. Contact</h2>
          <p className="mb-4">
            If you have any questions or concerns regarding these Terms of
            Service, please contact us at:
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
        </section>
      </div>
    </main>
  );
}
