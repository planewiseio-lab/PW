import { NextRequest } from "next/server";
import {
  getClientIp,
  getGuestUsage,
  incrementGuestUsage,
  resetGuestQuota,
} from "@/lib/guestQuota";

// Mock Redis pour les tests
jest.mock("@/lib/redis", () => ({
  getRedisValue: jest.fn(),
  setRedisValue: jest.fn(),
  incrementRedisValue: jest.fn(),
  getRedisTTL: jest.fn(),
}));

describe("Guest Quota System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-real-ip": "203.0.113.1",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.1");
    });

    it("should fallback to 127.0.0.1 in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const request = new NextRequest("http://localhost:3000/api/test");
      const ip = getClientIp(request);

      expect(ip).toBe("127.0.0.1");

      process.env.NODE_ENV = originalEnv;
    });

    it("should normalize IPv4 addresses", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-forwarded-for": "  192.168.1.100  ",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.100");
    });
  });

  describe("Guest Usage Management", () => {
    const mockIp = "192.168.1.1";

    it("should get initial guest usage (0/3)", async () => {
      const { getRedisValue, getRedisTTL } = require("@/lib/redis");
      getRedisValue.mockResolvedValue(null);
      getRedisTTL.mockResolvedValue(0);

      const usage = await getGuestUsage(mockIp);

      expect(usage).toEqual({
        count: 0,
        remaining: 3,
        ttl: 0,
      });
    });

    it("should get guest usage with existing count", async () => {
      const { getRedisValue, getRedisTTL } = require("@/lib/redis");
      getRedisValue.mockResolvedValue("2");
      getRedisTTL.mockResolvedValue(3600);

      const usage = await getGuestUsage(mockIp);

      expect(usage).toEqual({
        count: 2,
        remaining: 1,
        ttl: 3600,
      });
    });

    it("should increment guest usage", async () => {
      const { incrementRedisValue, getRedisTTL } = require("@/lib/redis");
      incrementRedisValue.mockResolvedValue(1);
      getRedisTTL.mockResolvedValue(86400);

      const usage = await incrementGuestUsage(mockIp);

      expect(usage).toEqual({
        count: 1,
        remaining: 2,
        ttl: 86400,
      });
      expect(incrementRedisValue).toHaveBeenCalledWith(
        `guest:ip:${mockIp}`,
        86400
      );
    });

    it("should handle quota exceeded scenario", async () => {
      const { getRedisValue, getRedisTTL } = require("@/lib/redis");
      getRedisValue.mockResolvedValue("3");
      getRedisTTL.mockResolvedValue(3600);

      const usage = await getGuestUsage(mockIp);

      expect(usage).toEqual({
        count: 3,
        remaining: 0,
        ttl: 3600,
      });
    });
  });

  describe("Guest Quota Integration", () => {
    const mockIp = "192.168.1.1";

    it("should allow first 3 requests", async () => {
      const { incrementRedisValue, getRedisTTL } = require("@/lib/redis");

      // Première requête
      incrementRedisValue.mockResolvedValueOnce(1);
      getRedisTTL.mockResolvedValueOnce(86400);

      let usage = await incrementGuestUsage(mockIp);
      expect(usage.remaining).toBe(2);

      // Deuxième requête
      incrementRedisValue.mockResolvedValueOnce(2);
      getRedisTTL.mockResolvedValueOnce(86400);

      usage = await incrementGuestUsage(mockIp);
      expect(usage.remaining).toBe(1);

      // Troisième requête
      incrementRedisValue.mockResolvedValueOnce(3);
      getRedisTTL.mockResolvedValueOnce(86400);

      usage = await incrementGuestUsage(mockIp);
      expect(usage.remaining).toBe(0);
    });

    it("should block 4th request", async () => {
      const { getRedisValue, getRedisTTL } = require("@/lib/redis");
      getRedisValue.mockResolvedValue("3");
      getRedisTTL.mockResolvedValue(3600);

      const usage = await getGuestUsage(mockIp);
      expect(usage.count).toBe(3);
      expect(usage.remaining).toBe(0);
    });

    it("should reset quota after TTL expires", async () => {
      const { getRedisValue, getRedisTTL } = require("@/lib/redis");

      // TTL expiré
      getRedisValue.mockResolvedValue(null);
      getRedisTTL.mockResolvedValue(-2);

      const usage = await getGuestUsage(mockIp);
      expect(usage.count).toBe(0);
      expect(usage.remaining).toBe(3);
    });
  });

  describe("Error Handling", () => {
    it("should handle Redis errors gracefully", async () => {
      const { getRedisValue } = require("@/lib/redis");
      getRedisValue.mockRejectedValue(new Error("Redis connection failed"));

      const usage = await getGuestUsage("192.168.1.1");

      // Should return default values on error
      expect(usage).toEqual({
        count: 0,
        remaining: 3,
        ttl: 0,
      });
    });

    it("should handle increment errors gracefully", async () => {
      const { incrementRedisValue } = require("@/lib/redis");
      incrementRedisValue.mockRejectedValue(
        new Error("Redis increment failed")
      );

      const usage = await incrementGuestUsage("192.168.1.1");

      // Should return fallback values on error
      expect(usage).toEqual({
        count: 1,
        remaining: 2,
        ttl: 86400,
      });
    });
  });

  describe("Reset Functionality", () => {
    it("should reset guest quota", async () => {
      const { setRedisValue } = require("@/lib/redis");
      setRedisValue.mockResolvedValue(true);

      await resetGuestQuota("192.168.1.1");

      expect(setRedisValue).toHaveBeenCalledWith(
        "guest:ip:192.168.1.1",
        "0",
        1
      );
    });
  });
});
