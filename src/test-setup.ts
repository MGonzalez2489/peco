// jsdom does not implement ResizeObserver, which several directives rely on.
// Provide a no-op implementation so component tests can render those directives.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {}

    unobserve(): void {}

    disconnect(): void {}
  }

  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
