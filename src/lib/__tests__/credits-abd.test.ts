import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { NextRequest } from "next/server";
import { withCreditChargeABD } from "@/lib/withCreditChargeABD";
import { ActionType } from "@prisma/client";

// Mock Supabase
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
};

// Mock Prisma
const mockPrisma = {
  $transaction: jest.fn(),
  creditBalance: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  creditLedger: {
    create: jest.fn(),
  },
  usageEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

// Mock the modules
jest.mock("@/lib/supabase/server", () => ({
  createClient: () => mockSupabase,
}));

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/credits", () => ({
  chargeOneCredit: jest.fn(),
  InsufficientCreditsError: class InsufficientCreditsError extends Error {
    constructor(message = "Insufficient credits") {
      super(message);
      this.name = "InsufficientCreditsError";
    }
  },
}));

describe("withCreditChargeABD", () => {
  const mockUser = {
    id: "test-user-123",
    email: "test@example.com",
  };

  const mockRequest = new NextRequest("http://localhost:3000/api/test", {
    method: "POST",
    body: JSON.stringify({ test: "data" }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error("Not authenticated"),
      });

      const handler = withCreditChargeABD(
        ActionType.AIRCRAFT_LOOKUP,
        async () => {
          return Response.json({ success: true });
        }
      );

      const response = await handler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(data.code).toBe("AUTH_REQUIRED");
    });

    it("should proceed if user is authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const { chargeOneCredit } = require("@/lib/credits");
      chargeOneCredit.mockResolvedValue({ newBalance: 4 });

      const handler = withCreditChargeABD(
        ActionType.AIRCRAFT_LOOKUP,
        async () => {
          return Response.json({ success: true, data: "test" });
        }
      );

      const response = await handler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(chargeOneCredit).toHaveBeenCalledWith({
        userId: mockUser.id,
        actionType: ActionType.AIRCRAFT_LOOKUP,
        idempotencyKey: expect.stringMatching(/^abd-test-user-123-.*/),
        refId: "/api/test",
        metadata: expect.objectContaining({
          endpoint: "/api/test",
          method: "POST",
          source: "abd_api_request",
        }),
      });
    });
  });

  describe("Credit Charging", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should charge 1 credit for successful ABD request", async () => {
      const { chargeOneCredit } = require("@/lib/credits");
      chargeOneCredit.mockResolvedValue({ newBalance: 4 });

      const handler = withCreditChargeABD(
        ActionType.AIRCRAFT_LOOKUP,
        async () => {
          return Response.json({ success: true, data: "aircraft_data" });
        }
      );

      const response = await handler(mockRequest);

      expect(chargeOneCredit).toHaveBeenCalledTimes(1);
      expect(chargeOneCredit).toHaveBeenCalledWith({
        userId: mockUser.id,
        actionType: ActionType.AIRCRAFT_LOOKUP,
        idempotencyKey: expect.stringMatching(/^abd-test-user-123-.*/),
        refId: "/api/test",
        metadata: expect.objectContaining({
          endpoint: "/api/test",
          method: "POST",
          source: "abd_api_request",
        }),
      });

      expect(response.headers.get("X-Credits-Remaining")).toBe("4");
      expect(response.headers.get("X-Credits-Charged")).toBe("1");
    });

    it("should return 402 if insufficient credits", async () => {
      const {
        chargeOneCredit,
        InsufficientCreditsError,
      } = require("@/lib/credits");
      chargeOneCredit.mockRejectedValue(new InsufficientCreditsError());

      const handler = withCreditChargeABD(
        ActionType.AIRCRAFT_LOOKUP,
        async () => {
          return Response.json({ success: true });
        }
      );

      const response = await handler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(402);
      expect(data.error).toBe("Insufficient credits");
      expect(data.code).toBe("INSUFFICIENT_CREDITS");
      expect(data.message).toBe(
        "You need at least 1 credit to use this service"
      );
    });

    it("should handle credit charging errors gracefully", async () => {
      const { chargeOneCredit } = require("@/lib/credits");
      chargeOneCredit.mockRejectedValue(new Error("Database error"));

      const handler = withCreditChargeABD(
        ActionType.AIRCRAFT_LOOKUP,
        async () => {
          return Response.json({ success: true });
        }
      );

      const response = await handler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Credit processing failed");
      expect(data.code).toBe("CREDIT_ERROR");
    });
  });

  describe("Idempotency", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should generate unique idempotency keys", async () => {
      const { chargeOneCredit } = require("@/lib/credits");
      chargeOneCredit.mockResolvedValue({ newBalance: 4 });

      const handler = withCreditChargeABD(
        ActionType.AIRCRAFT_LOOKUP,
        async () => {
          return Response.json({ success: true });
        }
      );

      // Call handler twice
      await handler(mockRequest);
      await handler(mockRequest);

      expect(chargeOneCredit).toHaveBeenCalledTimes(2);

      const calls = chargeOneCredit.mock.calls;
      const key1 = calls[0][0].idempotencyKey;
      const key2 = calls[1][0].idempotencyKey;

      expect(key1).not.toBe(key2);
      expect(key1).toMatch(/^abd-test-user-123-.*/);
      expect(key2).toMatch(/^abd-test-user-123-.*/);
    });
  });

  describe("Logging", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should log ABD request for user", async () => {
      const { chargeOneCredit } = require("@/lib/credits");
      chargeOneCredit.mockResolvedValue({ newBalance: 4 });

      const handler = withCreditChargeABD(
        ActionType.AIRCRAFT_LOOKUP,
        async () => {
          return Response.json({ success: true });
        }
      );

      await handler(mockRequest);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[ABD\] 🛩️ ABD request charged for user: test-user-123/
        )
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[ABD\] ✅ Credit charged: test-user-123 now has 4 credits/
        )
      );
    });
  });

  describe("Response Headers", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should add credit headers to response", async () => {
      const { chargeOneCredit } = require("@/lib/credits");
      chargeOneCredit.mockResolvedValue({ newBalance: 3 });

      const handler = withCreditChargeABD(
        ActionType.AIRCRAFT_LOOKUP,
        async () => {
          return Response.json({ success: true, data: "test" });
        }
      );

      const response = await handler(mockRequest);

      expect(response.headers.get("X-Credits-Remaining")).toBe("3");
      expect(response.headers.get("X-Credits-Charged")).toBe("1");
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
    });

    it("should handle handler errors", async () => {
      const { chargeOneCredit } = require("@/lib/credits");
      chargeOneCredit.mockResolvedValue({ newBalance: 4 });

      const handler = withCreditChargeABD(
        ActionType.AIRCRAFT_LOOKUP,
        async () => {
          throw new Error("Handler error");
        }
      );

      const response = await handler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.code).toBe("INTERNAL_ERROR");
    });

    it("should handle fatal errors", async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error("Fatal error"));

      const handler = withCreditChargeABD(
        ActionType.AIRCRAFT_LOOKUP,
        async () => {
          return Response.json({ success: true });
        }
      );

      const response = await handler(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });
});
