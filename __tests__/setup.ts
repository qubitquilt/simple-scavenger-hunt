import '@testing-library/jest-dom'

// Polyfill minimal web globals required by Next server modules
// Provide Request/Response/Headers so server route modules can import next/server
// These are lightweight stand-ins for testing purposes.

if (typeof global.Request === 'undefined') {
  // minimal Request polyfill
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.Request = class Request {
    constructor(input: any, init: any) {
      this.input = input
      this.init = init
    }
  }
}
if (typeof global.Response === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.Response = class Response {
    constructor(body: any, init: any) {
      this.body = body
      this.init = init
    }
  }
}
if (typeof global.Headers === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global.Headers = class Headers {
    constructor(init: any) {
      this.map = init || {}
    }
  }
}
