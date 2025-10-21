import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - PlaneWise",
  description: "PlaneWise terms of service and usage agreement.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-6">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Acceptance of Terms</h2>
          <p>
            By accessing and using PlaneWise, you accept and agree to be bound
            by the terms and provision of this agreement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Use License</h2>
          <p>
            Permission is granted to temporarily use PlaneWise for personal,
            non-commercial transitory viewing only. This is the grant of a
            license, not a transfer of title.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
          <p>
            The aviation data on PlaneWise is provided on an "as is" basis. To
            the fullest extent permitted by law, this Company excludes all
            representations, warranties, conditions and terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Limitations</h2>
          <p>
            In no event shall PlaneWise or its suppliers be liable for any
            damages arising out of the use or inability to use the aviation data
            on this website.
          </p>
        </section>
      </div>
    </main>
  );
}




