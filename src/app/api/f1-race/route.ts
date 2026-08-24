import { NextResponse } from "next/server";
import { getLatestF1RaceData } from "../../../lib/f1RaceData";

export const dynamic = "force-dynamic";

export async function GET(){return NextResponse.json(await getLatestF1RaceData(),{headers:{"Cache-Control":"public, s-maxage=900, stale-while-revalidate=1800"}});}
