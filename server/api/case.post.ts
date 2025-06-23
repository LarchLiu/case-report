import type { Info, User } from '~/types'
import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'

const prompt = `帮我识别图片上的病例信息，患者姓名，患者性别， 医院名称， 报告日期时间(YYYY-MM-DD HH:mm:ss)以及报告详情。

返回json格式：
interface Info {
  user: {
    name:string
    sex: string
  },
  case: {
    hospital: string
    report_date: string
  },
  reports: {
    chinese_name: string
    english_name: string
    value: string
    unit: string
    range: string
    notifaction: string
  }[]
}

return Info
仅返回 json 数据，不要有任何其他解释性文字。`

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig()
  const openai = new OpenAI({
    baseURL: runtimeConfig.aiApiBaseUrl,
    apiKey: runtimeConfig.aiApiKey,
  })
  const db = useDatabase()

  const parts = await readMultipartFormData(event)

  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No form data provided' })
  }

  const caseReports: Info[] = []
  const errorMessages: string[] = []

  for (const part of parts) {
    if (part.name === 'image' && part.filename) {
      const fileBuffer = part.data
      const fileType = part.type

      let openaiResponse = null
      try {
        const base64Image = fileBuffer.toString('base64')

        const response = await openai.chat.completions.create({
          model: runtimeConfig.aiModel,
          temperature: 0.1,
          messages: [
            {
              role: 'system',
              content: prompt,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${fileType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
        })
        openaiResponse = response.choices[0].message.content || '[]'
      }
      catch (error: any) {
        console.error('Error calling OpenAI API:', error)
        throw createError({ statusCode: 400, message: error.message || error.statusMessage })
      }

      const info = JSON.parse(openaiResponse.replace(/^(\n)?```json\n/, '').replace(/```(\n)?$/, '')) as Info

      console.warn(info)
      try {
        if (info.user) {
          let user = info.user
          let patientCase = info.case
          const reports = info.reports

          const existingUser = await db.sql`
              SELECT * FROM user WHERE name = ${user.name}
            `
          const newUserId = uuidv4()

          if (!existingUser.rows || existingUser.rows.length === 0) {
            if (user.name) {
              const result = await db.sql`
                  INSERT INTO user (id, identity, name, sex, phone)
                  VALUES (${newUserId}, ${user.identity || ''}, ${user.name}, ${user.sex}, ${user.phone || ''})
                  RETURNING id;
                `
              if (!result.rows || result.rows.length === 0 || !result.rows[0].id) {
                errorMessages.push('Failed to retrieve new user ID after insertion.')
                continue
              }
              user = { id: newUserId, identity: user.identity || '', name: user.name, sex: user.sex, phone: user.phone || '' }
            }
            else {
              errorMessages.push('未识别患者名称')
              continue
            }
          }
          else {
            user = existingUser.rows[0] as unknown as User
          }

          const existingCase = await db.sql`
              SELECT * FROM patient_case WHERE report_date = ${patientCase.report_date} AND hospital = ${patientCase.hospital}
              `
          if (existingCase.rows && existingCase.rows.length > 0) {
            errorMessages.push(`该病例已存在 ${patientCase.report_date} ${patientCase.hospital}`)
            continue
          }
          else {
            const newCaseId = uuidv4()
            const result = await db.sql`
              INSERT INTO patient_case (id, user_id, hospital, report_date) 
              VALUES (${newCaseId}, ${user.id}, ${patientCase.hospital}, ${patientCase.report_date})
              RETURNING id;
              `
            if (!result.rows || result.rows.length === 0 || !result.rows[0].id) {
              errorMessages.push('Failed to retrieve new case ID after insertion.')
              continue
            }
            patientCase = {
              id: newCaseId,
              user_id: user.id,
              hospital: patientCase.hospital,
              report_date: patientCase.report_date,
            }
          }

          if (reports && reports.length > 0) {
            for (const report of reports) {
              const newReportId = uuidv4()
              const result = await db.sql`
               INSERT INTO case_report (id, case_id, chinese_name, english_name, value, unit, range, notifaction) 
               VALUES (${newReportId}, ${patientCase.id}, ${report.chinese_name || ''}, ${report.english_name || ''}, ${report.value}, ${report.unit || ''}, ${report.range || ''}, ${report.notifaction || ''})
               RETURNING id;
               `
              if (!result.rows || result.rows.length === 0 || !result.rows[0].id) {
                errorMessages.push('Failed to insert report for case ID:', patientCase.id)
                continue
              }
            }
          }

          caseReports.push({
            user,
            case: patientCase,
            reports,
          })
        }
      }
      catch (dbError) {
        console.error('Error inserting into database:', dbError)
        errorMessages.push('Database error occurred during insertion')
      }
    }
  }

  return { info: caseReports, errorMessages }
})
