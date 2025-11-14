"use client";
export default function SectionDivider({
  contained = true, // true = aligné au container, false = full-bleed
  className = "",
}: {
  contained?: boolean;
  className?: string;
}) {
  const base = "h-px bg-gray-200/80";
  if (contained) {
    return (
      <div className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>
        <div className={base} />
      </div>
    );
  }
  return <div className={`${base} w-full ${className}`} />;
}
