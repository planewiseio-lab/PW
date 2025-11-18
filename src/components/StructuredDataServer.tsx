import StructuredData from "./StructuredData";

interface StructuredDataServerProps {
  type: "aircraft" | "flight" | "airport" | "website";
  data: Record<string, any>;
}

/**
 * Server Component wrapper for StructuredData
 * This allows using StructuredData in Server Components
 */
export default function StructuredDataServer({
  type,
  data,
}: StructuredDataServerProps) {
  // StructuredData is a client component, so we need to render it
  // In Next.js 15, we can use client components in server components
  return <StructuredData type={type} data={data} />;
}

