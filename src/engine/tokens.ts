// DEAD PIXELS - Token Registry & Global Token Linking (src/engine/tokens.ts)
// Strict implementation of token detection, canonicalization, and matching

export interface TokenEntry {
  canonical: string;
  category: 'device' | 'phone' | 'user';
  description: string;
  aliases: string[];
}

export const KNOWN_TOKENS: Record<string, TokenEntry> = {
  'DEV-7F3A': {
    canonical: 'DEV-7F3A',
    category: 'device',
    description: 'ADI-THINKPAD laptop + paired handset',
    aliases: ['DEV-7F3A', 'dev=DEV-7F3A', 'device: DEV-7F3A'],
  },
  'DEV-19C2': {
    canonical: 'DEV-19C2',
    category: 'device',
    description: "Kiran's old lab laptop",
    aliases: ['DEV-19C2', 'dev=DEV-19C2'],
  },
  '4471': {
    canonical: '4471',
    category: 'phone',
    description: "Adi's second SIM paired to ThinkPad, mislabelled as Kiran",
    aliases: ['4471', '...4471', '…4471', 'SIM2 ...4471', 'SIM2 ending 4471'],
  },
  'kiran.s': {
    canonical: 'kiran.s',
    category: 'user',
    description: "Kiran S., ex-partner of subject who moved to Bengaluru",
    aliases: ['kiran.s', 'user=kiran.s', 'KIRAN S.'],
  },
  'nila': {
    canonical: 'nila',
    category: 'user',
    description: 'Nila, subject of investigation',
    aliases: ['nila', 'acct=nila', 'NILA'],
  },
};

export class TokenRegistry {
  private tokens: Map<string, TokenEntry> = new Map();
  private aliasMap: Map<string, string> = new Map();

  constructor() {
    for (const [key, entry] of Object.entries(KNOWN_TOKENS)) {
      this.tokens.set(key, entry);
      this.aliasMap.set(entry.canonical.toLowerCase(), entry.canonical);
      for (const alias of entry.aliases) {
        this.aliasMap.set(alias.toLowerCase(), entry.canonical);
      }
    }
  }

  public canonicalize(raw: string): string | null {
    const trimmed = raw.trim().toLowerCase();
    if (this.aliasMap.has(trimmed)) {
      return this.aliasMap.get(trimmed)!;
    }

    // Pattern matching for device IDs: DEV-XXXX
    const devMatch = raw.match(/DEV-[0-9A-Z]{4}/i);
    if (devMatch) {
      const upper = devMatch[0].toUpperCase();
      if (this.tokens.has(upper)) return upper;
      return upper;
    }

    // Pattern matching for SIM/phone ending in 4471
    if (raw.includes('4471')) {
      return '4471';
    }

    return null;
  }

  public extractTokens(text: string): string[] {
    const found = new Set<string>();

    const devRegex = /DEV-[0-9A-F]{4}/gi;
    let match: RegExpExecArray | null;
    while ((match = devRegex.exec(text)) !== null) {
      const canonical = this.canonicalize(match[0]);
      if (canonical) found.add(canonical);
    }

    if (/4471/g.test(text)) {
      found.add('4471');
    }

    if (/acct=nila\b|user=kiran\.s\b/gi.test(text)) {
      if (/acct=nila/i.test(text)) found.add('nila');
      if (/user=kiran\.s/i.test(text)) found.add('kiran.s');
    }

    return Array.from(found);
  }

  public getTokenInfo(canonicalToken: string): TokenEntry | undefined {
    return this.tokens.get(canonicalToken);
  }

  public isRegistered(token: string): boolean {
    const canonical = this.canonicalize(token);
    return canonical !== null && this.tokens.has(canonical);
  }
}
