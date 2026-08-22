const imageCache = new Map<string, string>();

export const wireframeAvatar = (name: string) => {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><rect width="500" height="500" fill="#071019"/><circle cx="250" cy="184" r="92" fill="none" stroke="#32f5c0" stroke-width="4"/><path d="M95 476c7-114 65-170 155-170s148 56 155 170" fill="none" stroke="#32f5c0" stroke-width="4"/><text x="250" y="260" fill="#e8fff8" font-family="Arial" font-size="56" text-anchor="middle">${initials}</text></svg>`)}`;
};

export async function fetchAthleteImage(name: string): Promise<string> {
  if (imageCache.has(name)) return imageCache.get(name)!;
  try {
    const params = new URLSearchParams({ action: "query", titles: name, prop: "pageimages", format: "json", pithumbsize: "700", origin: "*" });
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error("Wikipedia image request failed");
    const data = await response.json() as { query?: { pages?: Record<string, { thumbnail?: { source?: string } }> } };
    const page = Object.values(data.query?.pages ?? {})[0];
    const url = page?.thumbnail?.source || wireframeAvatar(name);
    imageCache.set(name, url);
    return url;
  } catch {
    return wireframeAvatar(name);
  }
}
