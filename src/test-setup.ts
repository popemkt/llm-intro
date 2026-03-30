import '@testing-library/jest-dom'

if (typeof globalThis.BroadcastChannel === 'undefined') {
  class MockBroadcastChannel {
    name: string
    onmessage: ((this: BroadcastChannel, ev: MessageEvent) => unknown) | null = null
    onmessageerror: ((this: BroadcastChannel, ev: MessageEvent) => unknown) | null = null

    constructor(name: string) {
      this.name = name
    }

    postMessage() {}

    close() {}

    addEventListener() {}

    removeEventListener() {}

    dispatchEvent() {
      return true
    }
  }

  globalThis.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel
}
