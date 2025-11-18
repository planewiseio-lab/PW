import { NextRequest } from "next/server";

export function getRequestId(req: NextRequest): string {
	return req.headers.get("x-request-id") || "unknown";
}



























