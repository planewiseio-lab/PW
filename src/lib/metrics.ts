let cacheHit = 0;
let cacheMiss = 0;
let upstreamTimeouts = 0;
const latencyBuckets = [50, 100, 200, 500, 1000, 2000, 5000];
const latencyCounts = new Array(latencyBuckets.length + 1).fill(0);

export function recordCache(hit: boolean) {
	if (hit) cacheHit++; else cacheMiss++;
}

export function recordUpstreamTimeout() {
	upstreamTimeouts++;
}

export function recordLatency(ms: number) {
	for (let i = 0; i < latencyBuckets.length; i++) {
		if (ms <= latencyBuckets[i]) { latencyCounts[i]++; return; }
	}
	latencyCounts[latencyCounts.length - 1]++;
}

export function renderPrometheus(): string {
	let out = '';
	out += '# HELP cache_hits_total Total cache hits\n# TYPE cache_hits_total counter\n';
	out += `cache_hits_total ${cacheHit}\n`;
	out += '# HELP cache_misses_total Total cache misses\n# TYPE cache_misses_total counter\n';
	out += `cache_misses_total ${cacheMiss}\n`;
	out += '# HELP upstream_timeouts_total Total upstream timeouts\n# TYPE upstream_timeouts_total counter\n';
	out += `upstream_timeouts_total ${upstreamTimeouts}\n`;
	out += '# HELP request_latency_ms Latency histogram\n# TYPE request_latency_ms histogram\n';
	let cumulative = 0;
	for (let i = 0; i < latencyBuckets.length; i++) {
		cumulative += latencyCounts[i];
		out += `request_latency_ms_bucket{le="${latencyBuckets[i]}"} ${cumulative}\n`;
	}
	out += `request_latency_ms_bucket{le="+Inf"} ${cumulative + latencyCounts[latencyCounts.length - 1]}\n`;
	out += `request_latency_ms_count ${cumulative + latencyCounts[latencyCounts.length - 1]}\n`;
	return out;
}

















