import { NextResponse } from "next/server";
import { getAllMints } from "@/db/actions/collectibles";

/**
 * GET /api/admin/mints
 * Returns all mint records from the DB. Editor-only diagnostic route.
 */
export async function GET() {
  try {
    const mints = await getAllMints(100);
    return NextResponse.json({ count: mints.length, mints });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
