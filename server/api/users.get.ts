import type { User } from '~/types'

export default defineEventHandler(async () => {
  const db = useDatabase()
  const rawUsers = await db.sql`SELECT * FROM user`

  return (rawUsers.rows || []) as unknown as User[]
})
