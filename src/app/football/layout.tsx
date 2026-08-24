import "../football-cinema.css";
import "../football-analysis.css";

export default function FootballLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><link rel="preload" as="image" href="/assets/football-night-hero.webp" type="image/webp" fetchPriority="high" media="(min-width: 781px)"/>{children}</>;
}
