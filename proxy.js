import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'),
})

export async function proxy(req) {
  if (req.method !== 'POST') {
    return NextResponse.next()
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return new NextResponse('Too many requests — please slow down.', { status: 429 })
  }

  return NextResponse.next()
}
export const config = {
  matcher: ['/post-idea', '/project/:path*'],
}