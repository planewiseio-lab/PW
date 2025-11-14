import { NextRequest, NextResponse } from "next/server";

/**
 * Helper pour logger les requêtes API avec le temps de réponse
 * Utilisez-le dans vos routes API pour voir les logs en production
 */
export function withRequestLogging<T = any>(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse<T> | Response>,
  routeName?: string
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse<T> | Response> => {
    const shouldLog = process.env.LOG_REQUESTS === "true" || process.env.NODE_ENV === "development";
    const startTime = Date.now();
    const method = req.method;
    const pathname = req.nextUrl.pathname;
    const search = req.nextUrl.search;
    const route = routeName || pathname;

    if (shouldLog) {
      console.log(`[API] ${method} ${route}${search}`);
    }

    try {
      const response = await handler(req, ...args);
      const responseTime = Date.now() - startTime;
      const status = response instanceof NextResponse ? response.status : response.status;

      if (shouldLog) {
        console.log(`[API] ${method} ${route}${search} ${status} in ${responseTime}ms`);
      }

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[API] ${method} ${route}${search} ERROR in ${responseTime}ms:`, error);
      throw error;
    }
  };
}

