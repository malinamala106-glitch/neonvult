import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const data: any = {}
    if (typeof body.network === 'string') {
      const v = body.network.trim().slice(0, 32)
      if (!v) return NextResponse.json({ error: 'Network is required' }, { status: 400 })
      data.network = v
    }
    if (typeof body.address === 'string') {
      const v = body.address.trim().slice(0, 255)
      if (!v) return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
      data.address = v
    }
    if (typeof body.label === 'string') data.label = body.label.trim().slice(0, 64) || null
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }
    const wallet = await db.cryptoWallet.update({ where: { id }, data })
    return NextResponse.json({ wallet })
  } catch (e: any) {
    if (e.message === 'FORBIDDEN' || e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    const wallet = await db.cryptoWallet.findUnique({ where: { id } })
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    try {
      await db.cryptoWallet.delete({ where: { id } })
      return NextResponse.json({ ok: true })
    } catch (e: any) {
      // P2003 — foreign-key constraint: deposit records still reference this
      // wallet. Deleting would orphan transaction history, so the wallet is
      // DEACTIVATED instead: it disappears from the user deposit page but the
      // records linking old deposits keep pointing at a real wallet row.
      if (e?.code === 'P2003') {
        await db.cryptoWallet.update({ where: { id }, data: { isActive: false } })
        return NextResponse.json({
          ok: true,
          deactivated: true,
          message:
            'This wallet is used in deposit history, so it was deactivated instead of deleted. It no longer appears for buyers.',
        })
      }
      throw e
    }
  } catch (e: any) {
    if (e.message === 'FORBIDDEN' || e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
