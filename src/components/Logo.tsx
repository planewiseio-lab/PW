// src/components/Logo.tsx
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6">
        <defs>
          <linearGradient id="pwGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f0abfc" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <path
          d="M2 13l9 1 3 6 1-6 7-1-7-1-1-6-3 6-9 1z"
          fill="url(#pwGradient)"
        />
      </svg>
      <span className="text-xl font-extrabold tracking-tight">
        <span className="bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-500 bg-clip-text text-transparent">
          PlaneWise
        </span>
        <span className="text-gray-900">.io</span>
      </span>
    </div>
  );
}
