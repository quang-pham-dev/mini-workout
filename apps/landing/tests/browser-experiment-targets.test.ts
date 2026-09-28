import { browserExperimentTargets } from '../src/experimentation/browser-experiment-targets';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('browser experiment targets', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('annotates its CTA and reports exposure only after visibility', () => {
    const dispatchEvent = vi.fn();
    const element = {
      dataset: { experimentId: 'home-cta-aa' } as Record<string, string>,
      matches: () => true,
      querySelectorAll: () => [],
      dispatchEvent,
    };
    const disconnect = vi.fn();
    const observe = vi.fn();
    class Observer {
      constructor(
        private readonly listener: (
          entries: { isIntersecting: boolean }[],
        ) => void,
      ) {}
      observe() {
        observe();
        this.listener([{ isIntersecting: true }]);
      }
      disconnect() {
        disconnect();
      }
    }
    class EventWithDetail {
      constructor(
        readonly type: string,
        readonly options: Readonly<{ detail: unknown }>,
      ) {}
    }
    vi.stubGlobal('document', { querySelectorAll: () => [element] });
    vi.stubGlobal('window', { IntersectionObserver: Observer });
    vi.stubGlobal('IntersectionObserver', Observer);
    vi.stubGlobal('CustomEvent', EventWithDetail);

    const [target] = browserExperimentTargets();
    target!.applyAssignment({
      experimentId: 'home-cta-aa',
      experimentVersion: 1,
      variantId: 'control-b',
      experienceKey: 'home-cta-control',
    });
    const onVisible = vi.fn();
    target!.observeOnce(onVisible);

    expect(element.dataset).toMatchObject({
      experimentVariant: 'control-b',
      experimentExperience: 'home-cta-control',
      analyticsExperimentId: 'home-cta-aa.v1',
      analyticsVariantId: 'control-b',
    });
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(onVisible).toHaveBeenCalledOnce();
  });
});
