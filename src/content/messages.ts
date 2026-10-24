// DEAD PIXELS - Content: Messages & Timeline Markers (src/content/messages.ts)
// Verbatim from Build Bible v4 section 7.6

export interface ChatMessage {
  id: string;
  time: string; // HH:MM
  timestampMs: number; // For playhead scrubbing comparison on 12 Sep 2026
  sender: 'Sana' | 'Nila' | '4471';
  thread: 'mirrored_chat' | 'incoming_texts';
  text: string;
  isPinnable: boolean;
}

export interface RailMarker {
  id: string;
  time: string; // HH:MM
  timestampMs: number;
  label: string;
  isPinnable: boolean;
  description: string;
}

// Base date: 2026-09-12
function parseTime12Sep(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(2026, 8, 12, h, m).getTime();
}

/**
 * Mirrored chat between Nila and Sana (Kiran is never named).
 */
export const MIRRORED_CHAT: ChatMessage[] = [
  {
    id: 'msg:sana_2041',
    time: '20:41',
    timestampMs: parseTime12Sep('20:41'),
    sender: 'Sana',
    thread: 'mirrored_chat',
    text: 'u ok? u went quiet',
    isPinnable: false,
  },
  {
    id: 'msg:nila_2043',
    time: '20:43',
    timestampMs: parseTime12Sep('20:43'),
    sender: 'Nila',
    thread: 'mirrored_chat',
    text: "he's been texting since morning",
    isPinnable: false,
  },
  {
    id: 'msg:sana_2044_1',
    time: '20:44',
    timestampMs: parseTime12Sep('20:44'),
    sender: 'Sana',
    thread: 'mirrored_chat',
    text: 'who??',
    isPinnable: false,
  },
  {
    id: 'msg:nila_2044_2',
    time: '20:44',
    timestampMs: parseTime12Sep('20:44'),
    sender: 'Nila',
    thread: 'mirrored_chat',
    text: "can't say",
    isPinnable: false,
  },
  {
    id: 'msg:sana_2238_1',
    time: '22:38',
    timestampMs: parseTime12Sep('22:38'),
    sender: 'Sana',
    thread: 'mirrored_chat',
    text: "it's him isn't it",
    isPinnable: false,
  },
  {
    id: 'msg:nila_2238_2',
    time: '22:38',
    timestampMs: parseTime12Sep('22:38'),
    sender: 'Nila',
    thread: 'mirrored_chat',
    text: "i can't say",
    isPinnable: false,
  },
  {
    id: 'msg:sana_2244',
    time: '22:44',
    timestampMs: parseTime12Sep('22:44'),
    sender: 'Sana',
    thread: 'mirrored_chat',
    text: 'Nila. who',
    isPinnable: false,
  },
  {
    id: 'msg:nila_2245',
    time: '22:45',
    timestampMs: parseTime12Sep('22:45'),
    sender: 'Nila',
    thread: 'mirrored_chat',
    text: "i can't say. he keeps turning up",
    isPinnable: false,
  },
];

/**
 * Texts to Nila from …4471 (Adi's second SIM paired to this laptop).
 */
export const TEXTS_4471: ChatMessage[] = [
  {
    id: 'msg:4471_2055',
    time: '20:55',
    timestampMs: parseTime12Sep('20:55'),
    sender: '4471',
    thread: 'incoming_texts',
    text: "you've been quiet today",
    isPinnable: false,
  },
  {
    id: 'msg:4471_2102',
    time: '21:02',
    timestampMs: parseTime12Sep('21:02'),
    sender: '4471',
    thread: 'incoming_texts',
    text: 'saw you at the library. nice jacket',
    isPinnable: false,
  },
  {
    id: 'msg:4471_2240',
    time: '22:40',
    timestampMs: parseTime12Sep('22:40'),
    sender: '4471',
    thread: 'incoming_texts',
    text: 'im downstairs',
    isPinnable: true,
  },
  {
    id: 'msg:4471_2241',
    time: '22:41',
    timestampMs: parseTime12Sep('22:41'),
    sender: '4471',
    thread: 'incoming_texts',
    text: 'come down. just 5 min',
    isPinnable: true,
  },
  {
    id: 'msg:4471_2252',
    time: '22:52',
    timestampMs: parseTime12Sep('22:52'),
    sender: '4471',
    thread: 'incoming_texts',
    text: 'ok. ill wait',
    isPinnable: true,
  },
  {
    id: 'msg:4471_2330',
    time: '23:30',
    timestampMs: parseTime12Sep('23:30'),
    sender: '4471',
    thread: 'incoming_texts',
    text: 'still here',
    isPinnable: true,
  },
];

/**
 * Rail markers on the timeline (12 Sep, 20:00 to 23:59).
 */
export const RAIL_MARKERS: RailMarker[] = [
  {
    id: 'src:login_19c2_2112',
    time: '21:12',
    timestampMs: parseTime12Sep('21:12'),
    label: '21:12 login DEV-19C2',
    isPinnable: false,
    description: "Kiran's old lab laptop DEV-19C2 login",
  },
  {
    id: 'src:kiran_deactivated_2114',
    time: '21:14',
    timestampMs: parseTime12Sep('21:14'),
    label: '21:14 kiran.s deactivated',
    isPinnable: false,
    description: 'Kiran college account deactivation',
  },
  {
    id: 'src:kiran_airport_2210',
    time: '22:10',
    timestampMs: parseTime12Sep('22:10'),
    label: '22:10 KIRAN: posted from airport, Bengaluru',
    isPinnable: true,
    description: 'Public post saved by Adi: airport selfie, geotagged Bengaluru',
  },
];

/**
 * Combined and sorted message stream for timeline scrubber.
 */
export const ALL_NIGHT_MESSAGES: ChatMessage[] = [...MIRRORED_CHAT, ...TEXTS_4471].sort(
  (a, b) => a.timestampMs - b.timestampMs || a.id.localeCompare(b.id)
);
