import { describe, it, expect } from 'vitest';
import type { Pin, State } from '../src/engine/types';

describe('Stage 0 Scaffold & Types', () => {
  it('instantiates valid State structure', () => {
    const initialState: State = {
      pins: new Set<string>(),
      strands: { log: false, timeline: false, audio: false },
      photosOpened: false,
      truth: 0,
      ownerSolved: false,
      recordingDone: false,
      ending: null,
    };

    expect(initialState.truth).toBe(0);
    expect(initialState.strands.log).toBe(false);
    expect(initialState.pins.size).toBe(0);
  });

  it('instantiates valid Pin structure', () => {
    const samplePin: Pin = {
      id: 'DEV-7F3A',
      source: 'log',
      text: 'rule_created acct=nila dev=DEV-7F3A',
      real: 'mirror rule you created',
    };

    expect(samplePin.id).toBe('DEV-7F3A');
    expect(samplePin.source).toBe('log');
  });
});
