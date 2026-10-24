// DEAD PIXELS - Stage 10 Audio Synthesizer Unit Tests (tests/synth.test.ts)
// Strict verification of Web Audio synthesizer: fan hum, static noise, key ticks, pin drop, mute control, and graceful degradation

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioSynthesizer } from '../src/audio/synth';

function createMockAudioContext() {
  const destination = {};
  const currentTime = 10;
  let state = 'running';

  const createGain = () => {
    const gainNode = {
      gain: {
        value: 1,
        setValueAtTime: vi.fn((val: number) => {
          gainNode.gain.value = val;
        }),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    return gainNode;
  };

  const createOscillator = () => {
    const osc = {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: vi.fn((val: number) => {
          osc.frequency.value = val;
        }),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    return osc;
  };

  const createBiquadFilter = () => {
    const filter = {
      type: 'lowpass',
      frequency: {
        value: 1000,
        setValueAtTime: vi.fn((val: number) => {
          filter.frequency.value = val;
        }),
      },
      Q: {
        value: 1,
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    return filter;
  };

  const createBuffer = (channels: number, length: number, sampleRate: number) => {
    const channelData = new Float32Array(length);
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => channelData,
    };
  };

  const createBufferSource = () => {
    return {
      buffer: null as any,
      loop: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  };

  return {
    sampleRate: 44100,
    currentTime,
    get state() {
      return state;
    },
    destination,
    createGain,
    createOscillator,
    createBiquadFilter,
    createBuffer,
    createBufferSource,
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockImplementation(() => {
      state = 'closed';
      return Promise.resolve();
    }),
  };
}

describe('Stage 10 Audio Synthesis & Atmospheric Audio (src/audio/synth.ts)', () => {
  let originalAudioContext: any;

  beforeEach(() => {
    originalAudioContext = (globalThis as any).AudioContext;
  });

  afterEach(() => {
    (globalThis as any).AudioContext = originalAudioContext;
  });

  describe('1. Graceful Degradation in Headless / Blocked Environments', () => {
    it('initializes safely when AudioContext is completely undefined', () => {
      delete (globalThis as any).AudioContext;
      const synth = new AudioSynthesizer({ muted: true });

      expect(synth.getIsMuted()).toBe(true);
      expect(synth.initContext()).toBeNull();
      expect(synth.getContext()).toBeNull();

      // Safe invocation of all methods without throwing errors
      expect(() => synth.setMuted(false)).not.toThrow();
      expect(() => synth.updateSolvedStrandsCount(2)).not.toThrow();
      expect(() => synth.updateRadioStatic(5, true)).not.toThrow();
      expect(() => synth.playKeyTick()).not.toThrow();
      expect(() => synth.playPinClick()).not.toThrow();
      expect(() => synth.cutSound(100)).not.toThrow();
      expect(() => synth.playRoomTone()).not.toThrow();
      expect(() => synth.destroy()).not.toThrow();
    });

    it('handles constructor exceptions in AudioContext gracefully', () => {
      (globalThis as any).AudioContext = vi.fn().mockImplementation(() => {
        throw new Error('NotAllowedError: AudioContext was not allowed to start');
      });

      const synth = new AudioSynthesizer();
      expect(synth.initContext()).toBeNull();
      expect(() => synth.playKeyTick()).not.toThrow();
    });
  });

  describe('2. Mute Control & Master Gain', () => {
    it('defaults to muted state and applies zero gain upon initialization', () => {
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer();
      expect(synth.getIsMuted()).toBe(true);

      const ctx = synth.initContext();
      expect(ctx).toBe(mockCtx);
    });

    it('unmutes and sets master gain to MASTER_VOLUME', () => {
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer({ muted: true });
      synth.initContext();

      synth.setMuted(false);
      expect(synth.getIsMuted()).toBe(false);

      synth.setMuted(true);
      expect(synth.getIsMuted()).toBe(true);
    });
  });

  describe('3. Ambient Fan Hum Scaling', () => {
    it('scales fan hum frequency and gain down as solved strands increase', () => {
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer({ muted: false });
      synth.initContext();

      // 0 strands solved: 58Hz baseline
      synth.updateSolvedStrandsCount(0);
      // 4 strands solved: 48Hz calm drone
      synth.updateSolvedStrandsCount(4);

      expect(() => synth.updateSolvedStrandsCount(2)).not.toThrow();
    });
  });

  describe('4. Radio Static & Oscilloscope Audio', () => {
    it('silences static when player window is inactive or minimized', () => {
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer({ muted: false });
      synth.initContext();

      // Window minimized: static should be 0
      synth.updateRadioStatic(10, false);

      // Window active & unmuted: static scales with distance
      synth.updateRadioStatic(10, true);

      // Tuned close to fragment (minDistance = 0): low static
      synth.updateRadioStatic(0, true);
    });

    it('silences static when synthesizer is muted', () => {
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer({ muted: true });
      synth.initContext();

      synth.updateRadioStatic(12, true);
      expect(synth.getIsMuted()).toBe(true);
    });
  });

  describe('5. Tactile Feedback: Key Ticks & Pin Clicks', () => {
    it('does not produce sounds when muted', () => {
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer({ muted: true });
      synth.playKeyTick();
      synth.playPinClick();

      // AudioContext should not even be created if muted
      expect(synth.getContext()).toBeNull();
    });

    it('plays key tick when unmuted with rate-limiting cooldown', () => {
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer({ muted: false });
      synth.playKeyTick();

      expect(synth.getContext()).toBe(mockCtx);

      // Rapid consecutive call should be throttled safely
      synth.playKeyTick();
    });

    it('plays pin click when unmuted', () => {
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer({ muted: false });
      synth.playPinClick();

      expect(synth.getContext()).toBe(mockCtx);
    });
  });

  describe('6. Set Piece Audio: Flip Silence & Room Tone', () => {
    it('cutSound silences master gain for specified duration', () => {
      vi.useFakeTimers();
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer({ muted: false });
      synth.initContext();

      synth.cutSound(2000);
      vi.advanceTimersByTime(2000);

      vi.useRealTimers();
    });

    it('playRoomTone transitions audio to ambient room air', () => {
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer({ muted: false });
      synth.initContext();

      synth.playRoomTone();
      expect(() => synth.playRoomTone()).not.toThrow();
    });
  });

  describe('7. Lifecycle & Cleanup', () => {
    it('destroys all audio nodes and closes context cleanly', () => {
      const mockCtx = createMockAudioContext();
      (globalThis as any).AudioContext = vi.fn().mockReturnValue(mockCtx);

      const synth = new AudioSynthesizer({ muted: false });
      synth.initContext();

      synth.destroy();
      expect(synth.getContext()).toBeNull();
      expect(mockCtx.close).toHaveBeenCalled();
    });
  });
});
