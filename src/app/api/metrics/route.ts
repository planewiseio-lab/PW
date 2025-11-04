import { NextResponse } from "next/server";
import { renderPrometheus } from "@/lib/metrics";

export const runtime = "nodejs";

export async function GET() {
	const body = renderPrometheus();
	return new NextResponse(body, {
		status: 200,
		headers: { "Content-Type": "text/plain; version=0.0.4" },
	});
}












