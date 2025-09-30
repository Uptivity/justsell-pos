import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder for Jest
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock window.matchMedia
const mockMatchMedia = jest.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
})

// Mock IntersectionObserver
interface MockIntersectionObserver {
  root: Element | null
  rootMargin: string
  thresholds: ReadonlyArray<number>
  disconnect(): void
  observe(): void
  unobserve(): void
  takeRecords(): IntersectionObserverEntry[]
}

const MockIntersectionObserverClass = class implements MockIntersectionObserver {
  root: Element | null = null
  rootMargin: string = ''
  thresholds: ReadonlyArray<number> = []

  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

global.IntersectionObserver =
  MockIntersectionObserverClass as unknown as typeof IntersectionObserver
