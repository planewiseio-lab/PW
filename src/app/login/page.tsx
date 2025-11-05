"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirect = searchParams.get("redirect");
    const authUrl = redirect 
      ? `/auth?redirect=${encodeURIComponent(redirect)}&mode=login`
      : "/auth?mode=login";
    router.replace(authUrl);
  }, [router, searchParams]);

  return null;
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}