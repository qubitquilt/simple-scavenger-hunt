jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('next/server', () => ({ NextResponse: { redirect: (url: any) => ({ redirect: url.href }), next: () => ({ next: true }) } }))

const { middleware } = require('@/middleware')
const { getToken } = require('next-auth/jwt')

describe('middleware', () => {
  it('redirects to login when admin path and no token', async () => {
    ;(getToken as jest.Mock).mockResolvedValue(null)
    const req = { url: 'https://example.com/admin', nextUrl: { pathname: '/admin' } }
    const res = await middleware(req)
    expect(res).toEqual({ redirect: 'https://example.com/admin/login' })
  })

  it('allows next for non-admin path', async () => {
    ;(getToken as jest.Mock).mockResolvedValue(null)
    const req = { url: 'https://example.com/', nextUrl: { pathname: '/' } }
    const res = await middleware(req)
    expect(res).toEqual({ next: true })
  })
})
