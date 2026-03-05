import '@testing-library/jest-dom'

// jsdomにはIntersectionObserverがないため、スタブを設定する
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver
