type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: Record<string, any>) {
	const entry = {
		level,
		message,
		timestamp: new Date().toISOString(),
		...meta,
	};
	// Structured JSON log
	console.log(JSON.stringify(entry));
}

export const logger = {
	info: (message: string, meta?: Record<string, any>) => log("info", message, meta),
	warn: (message: string, meta?: Record<string, any>) => log("warn", message, meta),
	error: (message: string, meta?: Record<string, any>) => log("error", message, meta),
};


