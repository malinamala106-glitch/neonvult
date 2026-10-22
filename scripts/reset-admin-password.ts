/**
 * Reset an existing account's password and revoke its sessions.
 *
 * Usage (PowerShell):
 *   $env:NEW_PASSWORD = 'NewStrongPassword123'
 *   $env:ADMIN_EMAIL = 'admin@asset.shop'   # optional, defaults to admin@asset.shop
 *   npx tsx scripts/reset-admin-password.ts
 *
 * Reads DATABASE_URL from .env via Prisma, same as the app.
 */
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/password'

async function main() {
  const pass = process.env.NEW_PASSWORD?.trim()
  const email = process.env.ADMIN_EMAIL?.trim() || 'admin@asset.shop'

  if (!pass || pass.length < 10) {
    console.error('Set a NEW_PASSWORD of at least 10 characters first.')
    process.exit(1)
  }

  const user = await db.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No account found for ${email}. Check the email spelling.`)
    process.exit(1)
  }

  await db.user.update({
    where: { email },
    data: {
      passwordHash: hashPassword(pass),
      sessionVersion: { increment: 1 },
    },
  })

  console.log(`\nOK — password reset for ${email} (role: ${user.role}).`)
  console.log('All old sessions were revoked. Log in again with the new password.\n')
  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
