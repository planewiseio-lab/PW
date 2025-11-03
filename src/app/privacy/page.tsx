import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - PlaneWise",
  description:
    "PlaneWise privacy policy and data protection information. Learn how we collect, use, and protect your data.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://plane-wise.com/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-8">Last updated: November 3, 2025</p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">1. Who We Are</h2>
          <p className="mb-4">
            PlaneWise ("we", "our", or "us") provides aviation data lookup and
            tracking services.
          </p>
          <p className="mb-4">
            We are responsible for handling and protecting your information in
            accordance with this Privacy Policy.
          </p>
          <p className="mb-4">
            PlaneWise is operated by Mathieu Denis, based in Canada.
          </p>
          <p>
            If you have any questions, you can contact us at{" "}
            <a
              href="mailto:info@planewise.io"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              info@planewise.io
            </a>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            2. Information We Collect
          </h2>
          <p className="mb-4">
            PlaneWise primarily collects aviation data from publicly available
            sources and from the AeroDataBox API to provide aircraft
            registration lookup, flight tracking, and airport information.
          </p>
          <p className="mb-4">
            We may also collect limited technical information automatically when
            you use our website or API, including:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>IP address and country of origin</li>
            <li>Browser type and device information</li>
            <li>
              Usage logs (timestamps, API requests, and performance metrics)
            </li>
          </ul>
          <p>
            This data helps us maintain platform stability, monitor system
            performance, and prevent abuse.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            3. How We Use Your Information
          </h2>
          <p className="mb-4">
            We use the information we collect for the following purposes:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>
              To provide and improve aviation data lookup and tracking services
            </li>
            <li>To ensure reliable and secure platform operation</li>
            <li>To analyze usage patterns and optimize performance</li>
            <li>To detect and prevent misuse, abuse, or unauthorized access</li>
          </ul>
          <p>
            We do not use your information for advertising or resale purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            4. Data Hosting and Storage
          </h2>
          <p className="mb-4">
            All user and technical data are securely stored using Supabase, a
            managed database platform hosted within the European Union and/or
            United States, depending on infrastructure availability.
          </p>
          <p className="mb-4">
            Our web application is hosted by Vercel, which provides SSL
            encryption, data isolation, and secure delivery of our services.
          </p>
          <p>
            Both Vercel and Supabase maintain their own data protection and
            compliance measures aligned with industry standards.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">5. Data Sharing</h2>
          <p className="mb-4">
            We only share limited data with trusted third parties that support
            the operation of PlaneWise:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Vercel (for hosting and delivery)</li>
            <li>Supabase (for data storage and authentication)</li>
            <li>AeroDataBox (for public aviation data retrieval)</li>
          </ul>
          <p className="mb-4">
            We do not sell, rent, or trade your personal data.
          </p>
          <p>
            All third-party partners are bound by confidentiality and data
            protection agreements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
          <p className="mb-4">
            Technical and usage logs are retained for up to 90 days for system
            monitoring and optimization purposes.
          </p>
          <p className="mb-4">
            After that, data is either deleted or anonymized.
          </p>
          <p>
            If you request deletion of your information, we will process it
            within a reasonable timeframe.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
          <p className="mb-4">
            We implement appropriate administrative, technical, and
            organizational measures to safeguard your information against
            unauthorized access, disclosure, or alteration.
          </p>
          <p className="mb-4">These include:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Access control and authentication in Supabase</li>
            <li>Regular system monitoring and backup procedures</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">8. Your Rights</h2>
          <p className="mb-4">
            Depending on your location, you may have certain rights regarding
            your personal data, including:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Access to the data we hold about you</li>
            <li>Correction or deletion of inaccurate information</li>
            <li>Limitation or objection to data processing</li>
            <li>Data portability (where applicable)</li>
          </ul>
          <p>
            To exercise these rights, please contact us at{" "}
            <a
              href="mailto:info@planewise.io"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              info@planewise.io
            </a>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">9. Cookies</h2>
          <p className="mb-4">
            PlaneWise may use essential cookies to ensure the website functions
            properly and to track limited usage analytics.
          </p>
          <p>
            You can disable non-essential cookies through your browser settings
            at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            10. International Data Transfers
          </h2>
          <p className="mb-4">
            Your data may be processed or stored in countries other than your
            own (for example, in the United States or European Union).
          </p>
          <p>
            We ensure that such transfers comply with applicable data protection
            laws through appropriate safeguards.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            11. Updates to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time to reflect
            changes in our practices or for legal reasons. The date of the
            latest revision will always appear at the top of this page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
          <p className="mb-4">
            If you have any questions, concerns, or requests regarding this
            Privacy Policy, please contact us through our website or by email
            at:
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
