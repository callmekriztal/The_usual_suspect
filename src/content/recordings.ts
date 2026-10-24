// DEAD PIXELS - Content: Audio Recordings & Tuned Fragments (src/content/recordings.ts)
// Verbatim from Build Bible v4 section 7.8 & section 7.11

export interface AudioFragment {
  id: string;
  index: number;
  targetDial: number; // 18, 52, 81
  tolerance: number;  // +/- 3
  text: string;
}

export const TUNED_FRAGMENTS: AudioFragment[] = [
  {
    id: 'aud:frag_1',
    index: 1,
    targetDial: 18,
    tolerance: 3,
    text: "...he's outside again. I can see the light of a phone.",
  },
  {
    id: 'aud:frag_2',
    index: 2,
    targetDial: 52,
    tolerance: 3,
    text: "...I'm recording this for the warden. 12 September. 10:36 pm. Third time this week.",
  },
  {
    id: 'aud:frag_3',
    index: 3,
    targetDial: 81,
    tolerance: 3,
    text: "...I'm not going down. I know who it is.",
  },
];

export const LAST_RECORDING_TEXT = `[room tone. a door somewhere]

It's me. I know you'll hear this on the laptop,
because you read everything I put in this account.

I'm not missing. I'm at my aunt's.
I changed my number because you wouldn't stop.

You promised me on the second that you'd stop.
I believed you for about a day.

I'm not going to tell you where I am. I think you know.
Please don't come.

Close it. Delete it. That's all I want.`;
