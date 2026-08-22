import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export type NewsSport = "football" | "formula-one";
export type SportsNewsItem = {
  id: string;
  headline: string;
  summary: string;
  url: string;
  image: string;
  publishedAt: string;
  source: "ESPN";
  competition: string;
  trending: boolean;
};
export type SportsNewsFeed = {
  sport: NewsSport;
  items: SportsNewsItem[];
  fetchedAt: string;
  source: "ESPN" | "ESPN cached";
  rankingNote: string;
};

type EspnArticle = {
  id?: number | string;
  headline?: string;
  description?: string;
  published?: string;
  links?: { web?: { href?: string } };
  images?: Array<{ url?: string }>;
};

const feeds: Record<NewsSport, Array<{ label: string; url: string }>> = {
  football: [
    { label: "Premier League", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?limit=12" },
    { label: "Champions League", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/news?limit=12" },
    { label: "LaLiga", url: "https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/news?limit=8" },
  ],
  "formula-one": [{ label: "Formula One", url: "https://site.api.espn.com/apis/site/v2/sports/racing/f1/news?limit=24" }],
};

const lowValuePattern = /\b(odds|betting|betting guide|best bets|parlay|sportsbook|fantasy picks?)\b/i;

async function fetchPublisherFeed(url: string, competition: string) {
  try {
    const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return [];
    const body = await response.json() as { articles?: EspnArticle[] };
    return (body.articles || []).flatMap((article): SportsNewsItem[] => {
      const headline = article.headline?.trim() || "";
      const articleUrl = article.links?.web?.href || "";
      if (!headline || lowValuePattern.test(headline) || !articleUrl.startsWith("https://www.espn.com/")) return [];
      return [{
        id: String(article.id || articleUrl), headline, summary: article.description?.trim() || "Open the verified publisher report for the complete story.",
        url: articleUrl, image: article.images?.[0]?.url || "", publishedAt: article.published || new Date().toISOString(), source: "ESPN", competition, trending: false,
      }];
    });
  } catch { return []; }
}

function cachePath(sport: NewsSport) { return path.join(process.cwd(), "DataBase", "cache", "news", `${sport}.json`); }

export async function getSportsNews(sport: NewsSport): Promise<SportsNewsFeed> {
  const groups = await Promise.all(feeds[sport].map((feed) => fetchPublisherFeed(feed.url, feed.label)));
  const unique = new Map<string, SportsNewsItem>();
  for (const article of groups.flat()) if (!unique.has(article.headline.toLocaleLowerCase())) unique.set(article.headline.toLocaleLowerCase(), article);
  const items = [...unique.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 18).map((article, index) => ({ ...article, trending: index < 3 }));
  const payload: SportsNewsFeed = { sport, items, fetchedAt: new Date().toISOString(), source: "ESPN", rankingNote: "Trending uses the publisher’s current editorial order and story freshness." };
  if (items.length) {
    try { await fs.mkdir(path.dirname(cachePath(sport)), { recursive: true }); await fs.writeFile(cachePath(sport), JSON.stringify(payload, null, 2)); } catch { /* Read-only deployments still return live news. */ }
    return payload;
  }
  try { const cached = JSON.parse(await fs.readFile(cachePath(sport), "utf8")) as SportsNewsFeed; return { ...cached, source: "ESPN cached" }; }
  catch { return payload; }
}
