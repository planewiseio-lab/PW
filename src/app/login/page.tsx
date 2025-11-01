"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
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