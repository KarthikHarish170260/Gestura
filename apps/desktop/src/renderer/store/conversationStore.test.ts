import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useConversationStore } from './conversationStore';

describe('useConversationStore Zustand Store', () => {
  beforeEach(() => {
    const store = useConversationStore.getState();
    store.clearUtterances();
    store.clearSignerBuffer();
  });

  it('initializes with default settings and empty conversation', () => {
    const state = useConversationStore.getState();
    expect(state.utterances).toEqual([]);
    expect(state.signerBuffer).toEqual([]);
    expect(state.pendingCaption).toBe('');
    expect(state.settings.signLanguage).toBe('ISL');
    expect(state.settings.captionFontSize).toBe(18);
  });

  it('accumulates signs and collapses consecutive duplicates', () => {
    const store = useConversationStore.getState();
    store.addSignToBuffer('HELLO');
    store.addSignToBuffer('HELLO'); // duplicate should not duplicate
    store.addSignToBuffer('DOCTOR');

    const updated = useConversationStore.getState();
    expect(updated.signerBuffer).toEqual(['HELLO', 'DOCTOR']);
    expect(updated.pendingCaption).toBe('HELLO DOCTOR');
  });

  it('updates settings and preserves other properties', () => {
    const store = useConversationStore.getState();
    store.updateSettings({ highContrast: true, captionFontSize: 24 });

    const state = useConversationStore.getState();
    expect(state.settings.highContrast).toBe(true);
    expect(state.settings.captionFontSize).toBe(24);
    expect(state.settings.signLanguage).toBe('ISL'); // preserved
  });

  // Fast-check property-based test
  it('property: sequence of unique signs always builds a valid non-empty caption', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[A-Z]{2,10}$/), { minLength: 1, maxLength: 8 }),
        (signs) => {
          const store = useConversationStore.getState();
          store.clearSignerBuffer();

          for (const s of signs) {
            store.addSignToBuffer(s);
          }

          const state = useConversationStore.getState();
          expect(state.pendingCaption.length).toBeGreaterThan(0);
          expect(state.signerBuffer.length).toBeGreaterThan(0);
          expect(state.signerBuffer.length).toBeLessThanOrEqual(signs.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
