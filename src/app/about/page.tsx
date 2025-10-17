import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About PlaneWise - Aviation Data Platform",
  description:
    "Learn about PlaneWise, the professional aviation data platform for aircraft registration lookup, flight tracking, and airport information.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">About PlaneWise</h1>

      <div className="prose prose-lg max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p>
            PlaneWise is a professional aviation data platform designed to
            provide comprehensive aircraft registration lookup, real-time flight
            tracking, and detailed airport information to aviation enthusiasts
            and professionals.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">What We Offer</h2>
          <ul className="list-disc pl-6">
            <li>
              <strong>Aircraft Registration Lookup:</strong> Detailed
              information about aircraft including specifications, photos, and
              history
            </li>
            <li>
              <strong>Flight Tracking:</strong> Real-time flight status and
              tracking information
            </li>
            <li>
              <strong>Airport Information:</strong> Comprehensive airport data
              including departures and arrivals
            </li>
            <li>
              <strong>Flight History:</strong> Historical flight data for
              aircraft and routes
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Sources</h2>
          <p>
            Our aviation data is sourced from reliable public APIs and
            databases, including AeroDataBox and other trusted aviation data
            providers. We continuously work to ensure data accuracy and
            timeliness.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Technology</h2>
          <p>
            Built with modern web technologies including Next.js, React, and
            TypeScript, PlaneWise delivers fast, responsive, and reliable
            aviation data services across all devices and platforms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>
          <p>
            For questions, feedback, or partnership opportunities, please reach
            out to us through our website contact form.
          </p>
        </section>
      </div>
    </main>
  );
}



