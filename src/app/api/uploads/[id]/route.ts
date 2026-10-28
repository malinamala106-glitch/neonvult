import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'

// GET /api/uploads/[id] — serves an uploaded image's bytes from the database.
//
// Public (no auth): guests render product tiles, so the image URL must work
// for anonymous visitors too. The id is an opaque cuid generated server-side —
// enumeration-resistant and free of user-controlled path data.
//
// Uploads are immutable once written (never edited in place), so they can be
// cached aggressively: 1 year, immutable. The id changes whenever a different
// file is uploaded and attached to a product.

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = rateLimit({
    scope: 'uploads:read',
    identifier: clientIp(req),
    limit: 120,
    windowMs: 60 * 1000,
  })
  if (!limit.ok) return rateLimitResponse(limit)

  const { id } = await params
  // cuid shape check: fail fast instead of a pointless DB hit for junk input.
  if (!id || typeof id !== 'string' || id.length > 40 || !/^[a-z0-9]+$/i.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const row = await db.uploadedImage.findUnique({ where: { id } })
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const bytes = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data)
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': row.mime || 'application/octet-stream',
        'Content-Length': String(bytes.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': `default-src 'none'; style-src 'unsafe-inline'`,
        // For SVGs: browsers may render them directly — CSP prevents script
        // execution even if a paste is ever stored. Binary formats ignore it.
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 })
  }
}
