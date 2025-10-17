"use client";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200/70">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} PlaneWise.io
        </p>
        <div className="flex items-center gap-4 text-sm">
          <a href="/privacy" className="text-gray-600 hover:text-brand-700">
            Privacy
          </a>
          <a href="/terms" className="text-gray-600 hover:text-brand-700">
            Terms
          </a>
          <a href="/contact" className="text-gray-600 hover:text-brand-700">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
