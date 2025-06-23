import type { CaseReport, User } from '~/types'

export default defineEventHandler(async (event) => {
  const report = await readBody<CaseReport>(event)
  const db = useDatabase()

  await db.sql`
    UPDATE patient_case
    SET
      user_id = ${report.user_id},
      hospital = ${report.hospital},
      report_date = ${report.report_date}
    WHERE id = ${report.case_id};
    `
  return 'success'
})
