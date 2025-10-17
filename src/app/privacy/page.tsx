import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - PlaneWise",
  description: "PlaneWise privacy policy and data protection information.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Information We Collect
          </h2>
          <p>
            PlaneWise collects aviation data from public sources and APIs to
            provide aircraft registration lookup, flight tracking, and airport
            information services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            How We Use Your Information
          </h2>
          <ul className="list-disc pl-6">
            <li>Provide aviation data services</li>
            <li>Improve our platform functionality</li>
            <li>Analyze usage patterns for optimization</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p>
            We implement appropriate security measures to protect your
            information against unauthorized access, alteration, disclosure, or
            destruction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact
            us through our website.
          </p>
        </section>
      </div>
    </main>
  );
}



