import { getSession } from '@/lib/auth'
import { db, dbFindOne } from '@/lib/db'
import type { User } from '@/lib/types'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await dbFindOne<User>(db.users, { _id: session.userId })
  if (!user) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    userId: user._id,
    choirType: user.choirType,
    displayName: user.displayName,
  })
}
