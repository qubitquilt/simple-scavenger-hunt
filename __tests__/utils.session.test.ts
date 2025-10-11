import { getUserId, setUserId } from '@/utils/session'

describe('session utils', () => {
  const OLD_DOC = global.document

  beforeEach(() => {
    jest.resetModules()
    // mock document
    ;(global as any).document = { cookie: '' }
  })

  afterEach(() => {
    global.document = OLD_DOC as any
  })

  it('getUserId returns null when no cookie', () => {
    expect(getUserId()).toBeNull()
  })

  it('setUserId sets cookie and getUserId reads it', () => {
    setUserId('abc', 1)
    // document.cookie set by setUserId
    const cookie = (global as any).document.cookie
    expect(cookie).toContain('userId=abc')
    // now getUserId should return value
    expect(getUserId()).toBe('abc')
  })
})
