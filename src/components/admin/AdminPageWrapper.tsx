"use client";

import { usePathname } from "next/navigation";

export default function AdminPageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (!isAdmin) {
    return <>{children}</>;
  }

  // Page admin sans éléments
  return (
    <div className="fixed inset-0 bg-white overflow-auto z-50">
      <style jsx global>{`
        /* Cacher tous les éléments du layout principal */
        body > *:not([data-admin-content]) {
          display: none;
        }
      `}</style>
      <div className="p-8">{children}</div>
    </div>
  );
}
