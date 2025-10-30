Environment:

- REDIS_URL: Redis connection URL (e.g. redis://localhost:6379). If absent, an in-memory fallback is used.
- TRUSTED_PROXIES: Comma-separated list of proxy IPs considered trusted for X-Forwarded-For.
- ADMIN_RESET_ALLOWLIST: Comma-separated list of IPs allowed to call admin reset.
- SECRET_ADMIN_RESET: Secret token for admin reset endpoint.


