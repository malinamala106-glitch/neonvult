import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// /api/auctions/[id] — admin-only manage a single special deal.
//
// PATCH — edit fields. Guarded:
//   - askingPrice may only change while the deal has no bids (currentBid
//     semantics would otherwise silently desync from the bid floor).
//   - endsAt must be a valid future date when provided (extend/shorten a live
//     deal without invalidating bids already placed).
//
// DELETE — remove a deal outright. Blocked while bidders still hold locked
// funds on it: those funds are real user balances, so the admin must release
// them (Unlock bids) first — the UI's button guides that flow.

type AuctionUpsertData = {
  title?: string
  description?: string | null
  category?: string
  askingPrice?: number
  image?: string | null
  deliveryFormat?: string | null
  endsAt?: Date
  isActive?: boolean
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const existing = await db.auction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const data: AuctionUpsertData = {}

    if (typeof body.title === 'string') {
      const title = body.title.trim()
      if (!title || title.length > 200) {
        return NextResponse.json({ error: 'Title must be 1-200 characters' }, { status: 400 })
      }
      if (title !== existing.title) data.title = title
    }

    if (typeof body.description === 'string') data.description = body.description.trim().slice(0, 2000) || null

    if (typeof body.category === 'string') data.category = body.category.trim().slice(0, 80) || 'General'

    if (body.image !== undefined) {
      if (typeof body.image !== 'string') {
        return NextResponse.json({ error: 'Invalid image value' }, { status: 400 })
      }
      data.image = body.image.trim().slice(0, 500) || null
    }

    if (typeof body.deliveryFormat === 'string') data.deliveryFormat = body.deliveryFormat.trim().slice(0, 200) || null

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
      }
      data.isActive = body.isActive
    }

    if (body.askingPrice !== undefined) {
      const price = typeof body.askingPrice === 'string' ? parseFloat(body.askingPrice) : body.askingPrice
      if (typeof price !== 'number' || !isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'askingPrice must be a non-negative number' }, { status: 400 })
      }
      if (price !== existing.askingPrice) {
        const bidCount = await db.bid.count({ where: { auctionId: id } })
        if (bidCount > 0) {
          return NextResponse.json(
            { error: 'This deal already has bids — the asking price can no longer change.' },
            { status: 409 }
          )
        }
        data.askingPrice = price
      }
    }

    if (body.endsAt !== undefined && body.endsAt !== null && body.endsAt !== '') {
      const endsAt = new Date(body.endsAt)
      if (isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'endsAt must be a future date' }, { status: 400 })
      }
      if (endsAt.getTime() !== existing.endsAt.getTime()) data.endsAt = endsAt
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ auction: existing, unchanged: true })
    }

    // Keep the public list coherent: editing a deal that was manually hidden
    // back to visible must not resurrect a CANCELLED/ENDED auction.
    if (data.isActive === true && existing.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `This deal is ${existing.status.toLowerCase()} and cannot be reactivated — create a new one.` },
        { status: 409 }
      )
    }

    const auction = await db.auction.update({ where: { id }, data })
    return NextResponse.json({ auction })
  } catch (e: any) {
    if (e.message === 'FORBIDDEN' || e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    const existing = await db.auction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const lockedCount = await db.lockedBalance.count({ where: { auctionId: id, status: 'LOCKED' } })
    if (lockedCount > 0) {
      return NextResponse.json(
        {
          error:
            'Bidders still hold locked funds on this deal. Click "Unlock bids" to refund them first, then delete.',
        },
        { status: 409 }
      )
    }

    await db.auction.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e.message === 'FORBIDDEN' || e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
