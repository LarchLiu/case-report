export default defineNitroPlugin(async (_nitroApp) => {
  const db = useDatabase()

  // Create user table if it doesn't exist
  await db.sql`
    CREATE TABLE IF NOT EXISTS user (
      "id" TEXT PRIMARY KEY,
      "identity" TEXT,
      "name" TEXT,
      "sex" TEXT,
      "phone" TEXT
    )
  `

  await db.sql`
    CREATE TABLE IF NOT EXISTS patient_case (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT,
      "hospital" TEXT,
      "report_date" TEXT
    )
    `

  // Create salary table if it doesn't exist
  await db.sql`
    CREATE TABLE IF NOT EXISTS case_report (
      "id" TEXT PRIMARY KEY,
      "case_id" TEXT,
      "chinese_name" TEXT,
      "english_name" TEXT,
      "value" TEXT,
      "unit" TEXT,
      "range" TEXT,
      "notifaction" TEXT
    )
  `
  console.warn('Database tables checked/created.')
})
