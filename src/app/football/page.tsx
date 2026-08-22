import CinematicFootballDashboard from "../../components/CinematicFootballDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Football Intelligence · VeloStatiq", description: "Football fixtures, sourced player profiles, Champions League details, and explainable match predictions." };

export default function FootballPage() {
  return <CinematicFootballDashboard />;
}
