import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./gateway.css";
import "./brand-system.css";
import "./lighthouse.css";

export const metadata: Metadata = {
  title: { default: "VeloStatiq · Athletic Analytics", template: "%s" },
  description:
    "Football and Formula One analytics with sourced profiles, current schedules, race analysis, and explainable predictions.",
  applicationName: "VeloStatiq",
  keywords: [
    "football analytics",
    "Formula One analytics",
    "sports predictions",
    "F1 race analysis",
    "football fixtures",
  ],
  authors: [{ name: "Ashish Rupakheti" }],
  creator: "Ashish Rupakheti",
  publisher: "Ashish Rupakheti",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "VeloStatiq",
    title: "VeloStatiq · Athletic Analytics",
    description:
      "Football and Formula One intelligence with transparent, explainable predictions.",
  },
  twitter: {
    card: "summary",
    title: "VeloStatiq · Athletic Analytics",
    description:
      "Football and Formula One intelligence with transparent, explainable predictions.",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#060908",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="site-copyright">© 2026 Ashish Rupakheti. All rights reserved.</footer>
      </body>
    </html>
  );
}

