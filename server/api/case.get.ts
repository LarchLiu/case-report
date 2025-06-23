import type { Case, CaseReport, User } from '~/types'

export default defineEventHandler(async (event) => {
  const db = useDatabase()
  const { userIds } = getQuery(event)
  if (!userIds) {
    throw createError({ statusCode: 400, message: '请选择用户' })
  }
  const ids = (userIds as string).split(',').map(id => id.trim())
  let rawCases: Case[]
  if (ids.length > 1) {
    const placeholders = ids.map(() => '?').join(', ')
    const stmt = db.prepare(`SELECT * FROM patient_case WHERE user_id IN (${placeholders})`)
    rawCases = await stmt.all(...ids) as Case[]
  }
  else {
    const data = await db.sql`SELECT * FROM patient_case WHERE user_id = ${ids[0]}`
    rawCases = data.rows as unknown as Case[]
  }

  let rawCaseIds: string[] = []
  if (rawCases && rawCases.length > 0) {
    rawCaseIds = rawCases.map(row => row.id as string)
  }

  if (rawCaseIds.length === 0) {
    return [] as unknown as CaseReport[]
  }

  const placeholders = rawCaseIds.map(() => '?').join(', ')
  // const orConditions = rawCaseIds.map(id => `case_id = '${id}'`).join(' OR ')

  const stmt = db.prepare(`
    SELECT   
    r.id as report_id,  
    r.case_id,  
    r.chinese_name,  
    r.english_name,  
    r.value,  
    r.unit,  
    r.range,  
    r.notifaction,  
    c.user_id,  
    c.hospital,  
    c.report_date  
    FROM case_report r  
    JOIN patient_case c ON r.case_id = c.id  
    WHERE r.case_id IN (${placeholders})
  `)
  const rawReports = await stmt.all(...rawCaseIds)

  return (rawReports || []) as unknown as CaseReport[]
})
