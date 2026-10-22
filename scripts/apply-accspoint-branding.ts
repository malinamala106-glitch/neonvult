/**
 * One-shot branding applier for AccsPoint.
 * - Sets the siteName setting
 * - Replaces any 'DigitalVault' text in stored content settings
 * - Points the footer logo at /logo.png
 *
 * Usage:  npx tsx scripts/apply-accspoint-branding.ts
 */
import { db } from '../src/lib/db'

async function main() {
  // 1. siteName
  const siteName = await db.setting.findUnique({ where: { key: 'siteName' } })
  if (siteName) {
    await db.setting.update({ where: { key: 'siteName' }, data: { value: 'AccsPoint' } })
    console.log('siteName -> AccsPoint')
  } else {
    await db.setting.create({ data: { key: 'siteName', value: 'AccsPoint' } })
    console.log('siteName created -> AccsPoint')
  }

  // 2. Replace old brand name inside every stored setting value (content copy)
  const rows = await db.setting.findMany()
  for (const row of rows) {
    if (!row.value.includes('DigitalVault')) continue
    const updated = row.value.replaceAll('DigitalVault', 'AccsPoint')
    await db.setting.update({ where: { key: row.key }, data: { value: updated } })
    console.log(`rebranded text in setting: ${row.key}`)
  }

  // 3. Footer brand logo (upsert — row may not exist in a fresh DB)
  const footerPayload = JSON.stringify({
    brand: { logo_text: 'AccsPoint', logo_url: '/', logo_image: '/logo.png' },
  })
  await db.setting.upsert({
    where: { key: 'content.footer.config' },
    update: { value: footerPayload },
    create: { key: 'content.footer.config', value: footerPayload },
  })
  console.log('footer brand -> logo image + AccsPoint')

  await db.$disconnect()
  console.log('\nBRANDING APPLIED')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
