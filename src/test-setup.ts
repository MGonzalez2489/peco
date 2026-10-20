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

// jsdom does not implement window.matchMedia, which the theme preference
// code (store, theme service, install banner) and the responsive date picker
// rely on. Provide a minimal stub that resolves viewport width queries against
// the jsdom window and never matches anything else (light color scheme).
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => {
    const minWidth = /\(min-width:\s*([\d.]+)px\)/.exec(query);
    const maxWidth = /\(max-width:\s*([\d.]+)px\)/.exec(query);
    const matches =
      minWidth !== null
        ? window.innerWidth >= Number(minWidth[1])
        : maxWidth !== null
          ? window.innerWidth <= Number(maxWidth[1])
          : false;

    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    } as MediaQueryList;
  };
}
