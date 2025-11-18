import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy - PlaneWise",
  description:
    "PlaneWise refund policy. Learn about our refund terms and procedures for aviation data services.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://planewise.io/refund-policy",
  },
};

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Refund Policy</h1>

      <div className="prose prose-lg max-w-none">
        <p className="text-gray-600 mb-8">Last updated: November 3, 2025</p>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
            <p className="mb-4">
              At PlaneWise, we provide professional aviation data services on a subscription and credit basis.
            </p>
            <p className="mb-4">
              This Refund Policy explains the circumstances under which payments may or may not be refunded.
            </p>
            <p>
              By purchasing or subscribing to any paid service offered by PlaneWise ("the Service"), you acknowledge and agree to this Refund Policy.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">
              2. Free and Trial Plans
            </h2>
            <p className="mb-4">
              If a free or trial version of PlaneWise is offered, no payment
              information is collected until you choose to upgrade to a paid
              plan.
            </p>
            <p>No refunds apply to free or trial usage.</p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">3. Paid Plans — No Refunds</h2>
            <p className="mb-4">
              All payments made for subscriptions, usage credits, or any paid feature of PlaneWise are final and non-refundable.
            </p>
            <p className="mb-4">
              PlaneWise does not provide refunds for:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2">
              <li>change of mind or change of use,</li>
              <li>unused time within a subscription period,</li>
              <li>unused credits,</li>
              <li>early cancellation of a subscription,</li>
              <li>failure to cancel before renewal.</li>
            </ul>
            
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3">Exceptions (required or fair-use cases only)</h3>
              <p className="mb-4">
                A refund may be granted only in the following exceptional situations:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Duplicate payments caused directly by our billing system.</li>
                <li>Confirmed unauthorized or fraudulent transactions verified by our payment processor.</li>
                <li>Complete inability to access the Service due to a proven technical issue caused by PlaneWise, and only if no workaround is possible.</li>
              </ul>
              <p className="mb-4">
                Refunds are not guaranteed and remain at PlaneWise's sole discretion unless required by law.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">
              4. Refund Request Procedure
            </h2>
            <p className="mb-4">If your situation qualifies under the exceptions above:</p>
            <ol className="list-decimal pl-6 mb-4 space-y-2">
              <li>
                Email{" "}
                <a
                  href="mailto:info@planewise.io"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  info@planewise.io
                </a>{" "}
                with the subject: "Refund Request"
              </li>
              <li>
                Include:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>your transaction ID,</li>
                  <li>payment date,</li>
                  <li>detailed explanation.</li>
                </ul>
              </li>
              <li>
                Our team will review the request within 5 business days and inform you of the outcome.
              </li>
            </ol>
            <p>
              Approved refunds, if any, will be issued to the original payment method.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">
              5. Subscription Cancellations
            </h2>
            <p className="mb-4">
              You may cancel your subscription at any time. Cancellation stops future renewals but does not trigger a refund for the current billing period under any circumstances.
            </p>
            <p>
              To avoid being charged for the next billing cycle, cancellations must be submitted at least 24 hours before renewal.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">
              6. Changes to This Policy
            </h2>
            <p>
              PlaneWise may update or modify this Refund Policy at any time. The latest version will always be available on this page.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">Contact Us</h2>
            <p className="mb-4">
              If you have any questions, please contact:
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
      </div>
    </main>
  );
}

