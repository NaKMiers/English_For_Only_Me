import { connectDatabase } from '@/lib/db/connectDatabase'
import { seedVocabularyFromOfficialSource } from '@/modules/vocabulary/seed/seedVocabulary'

async function main() {
  await connectDatabase()

  const result = await seedVocabularyFromOfficialSource({ limit: 1000 })

  console.info(
    `Seeded vocabulary: ${result.insertedOrUpdated} inserted/updated, ${result.skipped} skipped. Source: ${result.sourceUrl}`
  )
}

main().catch(error => {
  console.error('Failed to seed vocabulary', error)
  process.exit(1)
})
