/**
 * Airport-Data Aircraft Image API utility
 *
 * Fetches aircraft images from airport-data.com API based on aircraft registration.
 * Returns thumbnail URLs, but extracts photo IDs to fetch full-size images.
 */

export type AircraftThumb = {
  url: string; // Full-size image URL (converted from thumbnail)
  thumbUrl: string; // Original thumbnail URL
  page: string;
  by?: string;
};

const PLACEHOLDER_IMAGE = "/Assets/airplane.jpg";

/**
 * Scrapes the photo page to get the full-size image URL
 *
 * Airport-Data photo pages contain the full-size image in the HTML.
 * We need to fetch the page and extract the image URL.
 */
async function fetchFullSizeImageUrl(photoLink: string): Promise<string> {
  if (!photoLink || !photoLink.includes("airport-data.com/aircraft/photo/")) {
    return "";
  }

  try {
    console.log(`[fetchFullSizeImageUrl] Fetching page: ${photoLink}`);
    const response = await fetch(photoLink, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PlaneWise/1.0)",
      },
    });

    if (!response.ok) {
      console.log(`[fetchFullSizeImageUrl] Page not found: ${photoLink}`);
      return "";
    }

    const html = await response.text();

    // Look for the main image in the page
    // Typical structure: <img src="https://airport-data.com/images/aircraft/images/..." ...>
    const imgMatch = html.match(
      /<img[^>]+src=["'](https:\/\/airport-data\.com\/images\/aircraft\/images\/[^"']+)["'][^>]*>/i
    );
    if (imgMatch && imgMatch[1]) {
      console.log(`[fetchFullSizeImageUrl] Found image: ${imgMatch[1]}`);
      return imgMatch[1];
    }

    // Try alternative pattern
    const imgMatch2 = html.match(
      /src=["']([^"']*airport-data\.com\/images\/aircraft[^"']*images[^"']*\.jpg[^"']*)["']/i
    );
    if (imgMatch2 && imgMatch2[1]) {
      console.log(`[fetchFullSizeImageUrl] Found image (alt): ${imgMatch2[1]}`);
      return imgMatch2[1];
    }

    console.log(`[fetchFullSizeImageUrl] No image found in page`);
    return "";
  } catch (error) {
    console.error("[fetchFullSizeImageUrl] Error fetching page:", error);
    return "";
  }
}

/**
 * Fetches aircraft images from Airport-Data API
 *
 * @param registry - Aircraft registration (e.g., "C-FNAX" or "G-KKAZ")
 * @param limit - Maximum number of images to return (default: 3)
 * @returns Promise<AircraftThumb[]> - Array of normalized image objects
 */
export async function fetchAircraftThumbs(
  registry: string,
  limit: number = 3
): Promise<AircraftThumb[]> {
  if (!registry || !registry.trim()) {
    return [
      {
        url: PLACEHOLDER_IMAGE,
        thumbUrl: PLACEHOLDER_IMAGE,
        page: "",
        by: undefined,
      },
    ];
  }

  try {
    const url = `https://airport-data.com/api/ac_thumb.json?r=${encodeURIComponent(
      registry
    )}&n=${limit}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s max - Scraping takes time

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // 404 or other errors - return placeholder
      if (response.status === 404) {
        return [
          {
            url: PLACEHOLDER_IMAGE,
            thumbUrl: PLACEHOLDER_IMAGE,
            page: "",
            by: undefined,
          },
        ];
      }
      return [
        {
          url: PLACEHOLDER_IMAGE,
          thumbUrl: PLACEHOLDER_IMAGE,
          page: "",
          by: undefined,
        },
      ];
    }

    const data = await response.json();

    // Check if API returned an error
    if (
      data.status === 404 ||
      (data.error && data.error.includes("not found"))
    ) {
      return [
        {
          url: PLACEHOLDER_IMAGE,
          thumbUrl: PLACEHOLDER_IMAGE,
          page: "",
          by: undefined,
        },
      ];
    }

    // Check if we have valid image data
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return [
        {
          url: PLACEHOLDER_IMAGE,
          thumbUrl: PLACEHOLDER_IMAGE,
          page: "",
          by: undefined,
        },
      ];
    }

    // Normalize the response
    // IMPORTANT: Airport-Data API ONLY provides 200px thumbnails via API
    // To get full-size images, we need to scrape the photo page
    const thumbs: AircraftThumb[] = await Promise.all(
      data.data.map(async (item: any) => {
        const thumbUrl = item.image || "";
        const photoLink = item.link || "";

        // Try to fetch full-size image by scraping the photo page
        let fullSizeUrl = thumbUrl; // Default to thumbnail
        if (photoLink) {
          const scrapedUrl = await fetchFullSizeImageUrl(photoLink);
          if (scrapedUrl) {
            fullSizeUrl = scrapedUrl;
          }
        }

        return {
          url: fullSizeUrl, // Try full-size, fallback to thumbnail
          thumbUrl: thumbUrl, // Original 200px thumbnail for grid
          page: photoLink,
          by: item.photographer || undefined,
        };
      })
    );

    // Filter out invalid entries
    const validThumbs = thumbs.filter(
      (thumb: AircraftThumb) => thumb.url && thumb.thumbUrl
    );

    // If no valid images found, return placeholder
    if (validThumbs.length === 0) {
      return [
        {
          url: PLACEHOLDER_IMAGE,
          thumbUrl: PLACEHOLDER_IMAGE,
          page: "",
          by: undefined,
        },
      ];
    }

    return validThumbs;
  } catch (error: any) {
    // Don't log AbortError as it's expected for slow APIs
    // Only log actual errors (network failures, etc.)
    if (error?.name !== "AbortError") {
      console.error("[fetchAircraftThumbs] Error fetching images:", error);
    }
    // Return placeholder for any error
    return [
      {
        url: PLACEHOLDER_IMAGE,
        thumbUrl: PLACEHOLDER_IMAGE,
        page: "",
        by: undefined,
      },
    ];
  }
}

/**
 * Checks if an image URL is from Airport-Data
 */
export function isAirportData(url: string): boolean {
  return /^https?:\/\/airport-data\.com/i.test(url);
}

/**
 * Checks if an image URL is a placeholder
 */
export function isPlaceholderImage(url: string): boolean {
  return url.includes("/Assets/airplane.jpg");
}
