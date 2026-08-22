import { ExternalLink, Newspaper, ShieldCheck, TrendingUp } from "lucide-react";

export type NewsItem = { id:string;headline:string;summary:string;url:string;image:string;publishedAt:string;source:string;competition:string;trending:boolean };
export type NewsFeedPayload = { sport:"football"|"formula-one";items:NewsItem[];fetchedAt:string;source:string;rankingNote:string };

export default function SportsNewsFeed({feed,loading,sport}:{feed:NewsFeedPayload|null;loading:boolean;sport:"football"|"formula-one"}) {
  const name=sport==="football"?"Football":"Formula One";
  return <section className={`sports-news ${sport}`}>
    <header className="sports-news-head"><div><p><Newspaper/> VERIFIED {name.toUpperCase()} NEWS</p><h1>News worth knowing.</h1><span>Fresh stories from a recognized sports newsroom. Each card opens the original report.</span></div><aside><ShieldCheck/><strong>{feed?.source||"ESPN"}</strong><small>{feed?`Updated ${relative(feed.fetchedAt)}`:"Connecting to publisher…"}</small></aside></header>
    {loading?<div className="news-loading"><i/><strong>Loading the latest {name} stories…</strong></div>:feed?.items.length?<><div className="news-lead-grid">{feed.items.slice(0,3).map((article,index)=><NewsCard key={article.id} article={article} lead={index===0}/>)}</div><div className="news-stream">{feed.items.slice(3).map(article=><NewsCard key={article.id} article={article}/>)}</div><footer className="news-trust"><ShieldCheck/><span><strong>Separated and source-checked</strong><small>{feed.rankingNote} Betting and sportsbook stories are filtered out.</small></span></footer></>:<div className="news-loading"><Newspaper/><strong>No verified stories are available right now.</strong><span>The feed will retry automatically. No placeholder headlines are invented.</span></div>}
  </section>;
}

function NewsCard({article,lead=false}:{article:NewsItem;lead?:boolean}) { return <a className={lead?"news-card lead":"news-card"} href={article.url} target="_blank" rel="noreferrer"><div className="news-image" style={article.image?{backgroundImage:`linear-gradient(180deg,transparent,#05080bd9),url(${JSON.stringify(article.image).slice(1,-1)})`}:undefined}>{!article.image&&<Newspaper/>}<span>{article.competition}</span></div><div className="news-copy">{article.trending&&<b><TrendingUp/> TRENDING NOW</b>}<h2>{article.headline}</h2><p>{article.summary}</p><footer><span>{article.source} · {relative(article.publishedAt)}</span><em>Read original <ExternalLink/></em></footer></div></a> }
function relative(value:string){const time=new Date(value).getTime(),difference=time-Date.now(),hours=Math.round(difference/3_600_000);if(Math.abs(hours)<24)return new Intl.RelativeTimeFormat("en",{numeric:"auto"}).format(hours,"hour");return new Intl.DateTimeFormat("en",{month:"short",day:"numeric",year:"numeric"}).format(new Date(value))}
