import type { CaseReport, User } from '~/types'

export default defineEventHandler(async (event) => {
  const report = await readBody<CaseReport>(event)
  const db = useDatabase()

  await db.sql`
    UPDATE case_report
    SET
      chinese_name = ${report.chinese_name},
      english_name = ${report.english_name},
      value = ${report.value},
      unit = ${report.unit},
      range = ${report.range},
      notifaction = ${report.notifaction}
    WHERE id = ${report.report_id};
    `
  return 'success'
})
