import { cookies, headers } from "next/headers";
import { LANG_COOKIE, type Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const jar = await cookies();
  const fromCookie = jar.get(LANG_COOKIE)?.value;
  if (fromCookie === "fr" || fromCookie === "en") return fromCookie;

  const accept = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  const first = accept.split(",")[0]?.trim() ?? "";
  if (first.startsWith("en")) return "en";
  return "fr";
}
