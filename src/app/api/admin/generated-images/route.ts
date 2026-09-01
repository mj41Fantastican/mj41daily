import { NextRequest, NextResponse } from 'next/server';
import { getAllGeneratedImages, getGeneratedImagesByEdition, getImageCollectionStats } from '@/db/actions/generated-images';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/generated-images
 * Returns the full generated image collection. Editor-only.
 * Optional query params:
 *   ?edition=420-special  — filter by edition
 *   ?stats=1              — return stats only
 */
export async function GET(req: NextRequest) {
  try {
    const edition = req.nextUrl.searchParams.get('edition');
    const statsOnly = req.nextUrl.searchParams.get('stats') === '1';

    if (statsOnly) {
      const stats = await getImageCollectionStats();
      return NextResponse.json(stats);
    }

    const images = edition
      ? await getGeneratedImagesByEdition(edition)
      : await getAllGeneratedImages(200);

    return NextResponse.json({ images, total: images.length });
  } catch (err) {
    console.error('[admin/generated-images] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
