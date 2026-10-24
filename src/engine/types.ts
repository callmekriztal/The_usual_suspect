// DEAD PIXELS - Core Engine Types (from Build Bible v4 section 10)

export type Pin = {
  id: string;
  source: 'log' | 'msg' | 'src' | 'aud' | 'photo';
  text: string;
  real?: string;
};

export type State = {
  pins: Set<string>;
  strands: {
    log: boolean;
    timeline: boolean;
    audio: boolean;
  };
  photosOpened: boolean;
  truth: 0 | 1 | 2 | 3;
  ownerSolved: boolean;
  recordingDone: boolean;
  ending: null | 'close' | 'open10';
};
