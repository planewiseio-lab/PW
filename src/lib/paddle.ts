/**
 * Paddle configuration and utilities
 */

export interface PaddleConfig {
  apiKey: string;
  clientToken?: string;
  environment?: "sandbox" | "production";
}

/**
 * Get Paddle configuration from environment variables
 */
export function getPaddleConfig(): PaddleConfig {
  const apiKey = process.env.PADDLE_API_KEY || process.env.PADDLE_SECRET_KEY;
  
  if (!apiKey) {
    throw new Error(
      "Paddle API key not configured. Please set PADDLE_API_KEY or PADDLE_SECRET_KEY in your environment variables."
    );
  }

  return {
    apiKey,
    clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
    environment: process.env.PADDLE_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
  };
}

/**
 * Check if Paddle is configured
 */
export function isPaddleConfigured(): boolean {
  try {
    getPaddleConfig();
    return true;
  } catch {
    return false;
  }
}

