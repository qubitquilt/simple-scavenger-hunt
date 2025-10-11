describe('authOptions', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  it('authorize returns admin user when credentials match env', async () => {
    process.env.ADMIN_USERNAME = 'admin'
    process.env.ADMIN_PASSWORD = 'secret'

    // require after setting env so module reads the values correctly
    const { credentialsAuthorize } = require('@/lib/auth')
    const user = await credentialsAuthorize({ username: 'admin', password: 'secret' })
    expect(user).toBeDefined()
    expect(user.admin).toBe(true)
    expect(user.id).toBe('admin')
  })

  it('authorize returns null for wrong credentials', async () => {
    process.env.ADMIN_USERNAME = 'admin'
    process.env.ADMIN_PASSWORD = 'secret'

    const { authOptions } = require('@/lib/auth')
    const provider = authOptions.providers![0] as any
    const user = await provider.authorize({ username: 'no', password: 'wrong' })
    expect(user).toBeNull()
  })

  it('jwt and session callbacks propagate admin flag and id', async () => {
    const { authOptions } = require('@/lib/auth')
    // jwt: when user provided sets token.admin
    const jwtCb = (authOptions.callbacks as any).jwt!
    const sessionCb = (authOptions.callbacks as any).session!

    const token = await jwtCb({ token: { sub: undefined }, user: { admin: true } })
    expect(token.admin).toBe(true)

    const session = await sessionCb({ session: { user: {} } as any, token: { sub: '123', admin: true } as any })
    expect(session.user.id).toBe('123')
    expect(session.user.admin).toBe(true)
  })
})
