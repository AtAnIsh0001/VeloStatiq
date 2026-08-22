import FormulaOneDashboard from "../../components/FormulaOneDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Formula One Intelligence · VeloStatiq", description: "Formula One drivers, race strategy, tyre models, pit-stop and fastest-lap predictions." };

export default function FormulaOnePage() {
  return <FormulaOneDashboard />;
}
