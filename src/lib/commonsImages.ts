/**
 * Wikimedia Commons Aircraft Images API utility
 *
 * Fetches aircraft images from Wikimedia Commons based on aircraft registration.
 */

export type CommonsImage = {
  id: string;
  url: string; // High-res image URL (1024px or 800px)
  thumb: string; // Thumbnail URL (300px)
  page: string; // Link to Commons file page
  author: string | null;
  license: string | null;
  license_url: string | null;
};

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

/**
 * Fetches aircraft images from Wikimedia Commons by registration
 *
 * @param registry - Aircraft registration (e.g., "C-FNAX", "D-ABYU")
 * @param limit - Maximum number of images to return (default: 5)
 * @returns Promise<CommonsImage[]> - Array of normalized image objects
 */
export async function fetchCommonsImagesByRegistration(
  registry: string,
  limit: number = 5
): Promise<CommonsImage[]> {
  if (!registry || !registry.trim()) {
    return [];
  }

  try {
    // Step 1: Search for files matching the registration
    const searchUrl = `${COMMONS_API}?${new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      list: "search",
      srsearch: `${registry} filetype:bitmap aircraft`,
      srnamespace: "6", // File namespace
      srlimit: "10",
    }).toString()}`;

    console.log(`[fetchCommonsImages] Searching for: ${registry}`);
    const searchResponse = await fetch(searchUrl, {
      headers: {
        "User-Agent": "PlaneWise/1.0 (https://planewise.app)",
      },
    });

    if (!searchResponse.ok) {
      console.error(
        `[fetchCommonsImages] Search failed: ${searchResponse.status}`
      );
      return [];
    }

    const searchData = await searchResponse.json();
    const searchResults = searchData.query?.search || [];

    if (searchResults.length === 0) {
      console.log(`[fetchCommonsImages] No images found for ${registry}`);
      return [];
    }

    // Step 2: Get file titles (max limit)
    const fileTitles = searchResults
      .slice(0, limit)
      .map((r: any) => r.title)
      .join("|");

    // Step 3: Fetch image info for the found files
    const imageInfoUrl = `${COMMONS_API}?${new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      prop: "imageinfo",
      titles: fileTitles,
      iiprop: "url|user|extmetadata",
      iiurlwidth: "1024", // High-res for main image
    }).toString()}`;

    console.log(
      `[fetchCommonsImages] Fetching image info for ${searchResults.length} results`
    );
    const imageInfoResponse = await fetch(imageInfoUrl, {
      headers: {
        "User-Agent": "PlaneWise/1.0 (https://planewise.app)",
      },
    });

    if (!imageInfoResponse.ok) {
      console.error(
        `[fetchCommonsImages] Image info failed: ${imageInfoResponse.status}`
      );
      return [];
    }

    const imageInfoData = await imageInfoResponse.json();
    const pages = imageInfoData.query?.pages || {};

    // Step 4: Normalize the response
    const images: CommonsImage[] = [];

    for (const page of Object.values<any>(pages)) {
      if (!page.imageinfo?.[0]) continue;

      const ii = page.imageinfo[0];
      const url = ii.thumburl || ii.url || "";
      const thumbUrl = ii.thumburl || ii.url || "";

      if (!url) continue;

      // Extract author
      const author =
        ii.user ||
        ii.extmetadata?.Artist?.value ||
        ii.extmetadata?.Credit?.value ||
        null;

      // Extract license
      const license =
        ii.extmetadata?.License?.value ||
        ii.extmetadata?.LicenseShortName?.value ||
        null;

      // Extract license URL
      const licenseUrl =
        ii.extmetadata?.LicenseUrl?.value ||
        ii.extmetadata?.License?.value?.match(/<a[^>]+href="([^"]+)"/)?.[1] ||
        null;

      images.push({
        id: page.title || String(page.pageid),
        url, // High-res URL (1024px)
        thumb: thumbUrl, // Same as url for now, could be made 300px if needed
        page:
          ii.descriptionurl ||
          `https://commons.wikimedia.org/wiki/${page.title}`,
        author,
        license,
        license_url: licenseUrl,
      });
    }

    console.log(
      `[fetchCommonsImages] Found ${images.length} images for ${registry}`
    );
    return images;
  } catch (error: any) {
    console.error("[fetchCommonsImages] Error:", error);
    return [];
  }
}

/**
 * Checks if an image URL is from Wikimedia Commons
 */
export function isCommonsImage(url: string): boolean {
  return (
    /^https?:\/\/upload\.wikimedia\.org/i.test(url) ||
    /^https?:\/\/commons\.wikimedia\.org/i.test(url)
  );
}
