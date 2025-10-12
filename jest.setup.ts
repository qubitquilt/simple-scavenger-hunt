import '@testing-library/jest-dom'

declare var jest: any;

// Polyfill minimal web globals required by Next server modules
// Provide Request/Response/Headers so server route modules can import next/server
// These are lightweight stand-ins for testing purposes.

class MockRequest {
  constructor(input: any, init: any) {
    (this as any).input = input;
    (this as any).init = init;
  }
}

if (typeof global.Request === 'undefined') {
  (global as any).Request = MockRequest;
}
if (typeof global.Response === 'undefined') {
  (global as any).Response = class Response {
    constructor(body: any, init: any) {
      (this as any).body = body;
      (this as any).init = init;
    }
  }
}
if (typeof global.Headers === 'undefined') {
  (global as any).Headers = class Headers {
    constructor(init: any) {
      (this as any).map = init || {};
    }
  }
}

// Mock next/server NextResponse.json used by route handlers
// Export a NextResponse with a json helper; also export NextRequest/Headers if needed
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => body,
    redirect: (url: string) => ({ redirect: url })
  },
  NextRequest: class NextRequest {},
  Headers: class Headers {
    constructor(init: any) { ;(this as any).map = init || {} }
  }
}))

// Provide a default mock for getServerSession from next-auth
// so routes that import it won't throw; individual tests can override this mock in-suite.
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
