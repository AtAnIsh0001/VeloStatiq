import type { Metadata } from "next";
import SoundController from "../components/SoundController";
import "./globals.css";
import "./gateway.css";
import "./brand-system.css";

export const metadata: Metadata = { title: "VeloStatiq", description: "Athletic analytics, sourced profiles, live schedules, and explainable predictions" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<SoundController/></body></html>;
}
