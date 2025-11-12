import { describe, it, expect } from "vitest";

// Smoke tests assuming Next API routes run in test env

describe('health/ready/metrics', () => {
  it('health returns ok json', async () => {
    const res = await fetch('http://localhost:3000/api/health');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('ok');
  });

  it('ready returns json', async () => {
    const res = await fetch('http://localhost:3000/api/ready');
    expect([200,503]).toContain(res.status);
    const json = await res.json();
    expect(json).toHaveProperty('checks');
  });

  it('metrics returns text', async () => {
    const res = await fetch('http://localhost:3000/api/metrics');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/cache_hits_total/);
  });
});






















