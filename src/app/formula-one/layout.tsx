import "../formula-one.css";
import "../formula-one-analysis.css";

export default function FormulaOneLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><link rel="preload" as="image" href="/assets/f1-night-hero.webp" type="image/webp" fetchPriority="high" media="(min-width: 781px)"/>{children}</>;
}
