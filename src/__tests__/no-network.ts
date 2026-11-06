// Loaded by vitest.config.ts (`setupFiles`) before every unit test file.
//
// WHY (cabo 9 of docs/roadmap.md, 2026-11-04): jsdom's origin is
// http://localhost:3000, the same as the real backend. Before this file, a test
// that forgot to mock `fetch` sent its request there: with the backend running it
// could read, or even write, the human's real data. Now no request leaves.
//
// How it works: `fetch` (and the other ways a page can open a connection) is
// replaced by a function that writes the request down and rejects. Rejecting alone
// would not fail the test, because the HTTP client turns the rejection into an
// `ApiError` and the view shows it. So, after each test, any request written down
// fails that test, naming the method and the path. A test answers its requests with
// `vi.spyOn(globalThis, 'fetch')` (each feature's `mockBackend`), which sits on top
// of this replacement; `vi.restoreAllMocks()` and `vi.unstubAllGlobals()` bring
// back this replacement, never the real `fetch`.

import { afterAll, afterEach } from 'vitest'

/** Requests no mock answered since the last check, as `METHOD /path?query`. */
const unanswered: string[] = []

/** Where a relative URL points: jsdom's origin, or the backend's in a node-environment file. */
const ORIGIN = typeof location === 'undefined' ? 'http://localhost:3000' : location.origin

function describeTarget(input: unknown): string {
  try {
    const url = new URL(input instanceof Request ? input.url : String(input), ORIGIN)
    return `${url.pathname}${url.search}`
  } catch {
    return String(input)
  }
}

function refuse(method: string, target: string): Error {
  const request = `${method.toUpperCase()} ${target}`
  unanswered.push(request)
  return new TypeError(`Unit tests do not reach the network: no mock answered ${request}`)
}

/** Empties the list of unanswered requests and returns it. Only for the test of this file. */
export function takeUnansweredRequests(): string[] {
  return unanswered.splice(0)
}

function failIfAnyUnanswered(when: string): void {
  const requests = takeUnansweredRequests()
  if (requests.length > 0) {
    throw new Error(
      `${when}, a request was sent that no mock answered (unit tests never reach the network): ` +
        requests.join(', '),
    )
  }
}

globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
  return Promise.reject(refuse(method, describeTarget(input)))
}

// Files that run in `// @vitest-environment node` have no XMLHttpRequest.
if (typeof XMLHttpRequest !== 'undefined') {
  globalThis.XMLHttpRequest = class extends XMLHttpRequest {
    #method = 'GET'
    #target = ''
    override open(method: string, url: string | URL, ...rest: [boolean?, string?, string?]): void {
      this.#method = method
      this.#target = describeTarget(url)
      super.open(method, url, ...(rest as [boolean, string?, string?]))
    }
    override send(): void {
      throw refuse(this.#method, this.#target)
    }
  }
}

// `new WebSocket(url)` and `new EventSource(url)` call these, which throw before
// anything opens.
function refusedWebSocket(url: string | URL): never {
  throw refuse('WEBSOCKET', describeTarget(url))
}
globalThis.WebSocket = refusedWebSocket as unknown as typeof WebSocket

function refusedEventSource(url: string | URL): never {
  throw refuse('EVENTSOURCE', describeTarget(url))
}
globalThis.EventSource = refusedEventSource as unknown as typeof EventSource

if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'sendBeacon', {
    configurable: true,
    value: (url: string | URL): boolean => {
      throw refuse('POST', describeTarget(url))
    },
  })
}

afterEach(() => failIfAnyUnanswered('During this test'))
afterAll(() => failIfAnyUnanswered('After the last test of this file'))
