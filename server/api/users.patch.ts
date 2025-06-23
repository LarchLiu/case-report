import type { User } from '~/types'

export default defineEventHandler(async (event) => {
  const user = await readBody<User>(event)
  const db = useDatabase()

  await db.sql`
    UPDATE user
    SET
      identity = ${user.identity.toString()},
      name = ${user.name},
      phone = ${user.phone.toString()},
    WHERE id = ${user.id};
    `
  return 'success'
})
