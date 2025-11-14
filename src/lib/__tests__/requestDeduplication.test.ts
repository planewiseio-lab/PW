/**
 * Tests pour le système de déduplication de requêtes
 */

import {
  deduplicateRequest,
  cachedRequest,
  clearCache,
} from "../requestDeduplication";

describe("Request Deduplication", () => {
  beforeEach(() => {
    clearCache();
  });

  test("should deduplicate identical requests", async () => {
    const mockRequest = jest.fn(() => Promise.resolve("result"));

    // Lancer deux requêtes simultanées avec la même clé
    const promise1 = deduplicateRequest("test_key", mockRequest);
    const promise2 = deduplicateRequest("test_key", mockRequest);

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBe("result");
    expect(result2).toBe("result");
    expect(mockRequest).toHaveBeenCalledTimes(1); // Une seule requête réelle
  });

  test("should not deduplicate different keys", async () => {
    const mockRequest = jest.fn(() => Promise.resolve("result"));

    const promise1 = deduplicateRequest("key1", mockRequest);
    const promise2 = deduplicateRequest("key2", mockRequest);

    await Promise.all([promise1, promise2]);

    expect(mockRequest).toHaveBeenCalledTimes(2); // Deux requêtes distinctes
  });

  test("should handle request errors correctly", async () => {
    const mockRequest = jest.fn(() =>
      Promise.reject(new Error("Request failed"))
    );

    await expect(deduplicateRequest("error_key", mockRequest)).rejects.toThrow(
      "Request failed"
    );

    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});

describe("Cached Request", () => {
  beforeEach(() => {
    clearCache();
  });

  test("should return cached result", async () => {
    const mockRequest = jest.fn(() => Promise.resolve("fresh_result"));

    // Première requête
    const result1 = await cachedRequest("cache_key", mockRequest, 5000);
    expect(result1).toBe("fresh_result");
    expect(mockRequest).toHaveBeenCalledTimes(1);

    // Deuxième requête (devrait utiliser le cache)
    const result2 = await cachedRequest("cache_key", mockRequest, 5000);
    expect(result2).toBe("fresh_result");
    expect(mockRequest).toHaveBeenCalledTimes(1); // Pas de nouvel appel
  });

  test("should refresh cache after TTL expires", async () => {
    const mockRequest = jest.fn(() => Promise.resolve("fresh_result"));

    // Première requête
    await cachedRequest("cache_key", mockRequest, 100); // TTL court
    expect(mockRequest).toHaveBeenCalledTimes(1);

    // Attendre que le cache expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Nouvelle requête (devrait refaire l'appel)
    await cachedRequest("cache_key", mockRequest, 100);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  test("should clear cache correctly", async () => {
    const mockRequest = jest.fn(() => Promise.resolve("result"));

    // Mettre en cache
    await cachedRequest("cache_key", mockRequest, 5000);
    expect(mockRequest).toHaveBeenCalledTimes(1);

    // Nettoyer le cache
    clearCache("cache_key");

    // Nouvelle requête (devrait refaire l'appel)
    await cachedRequest("cache_key", mockRequest, 5000);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});




