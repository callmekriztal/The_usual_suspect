// DEAD PIXELS - Text Scramble & Reveal Effect (src/ui/fx/scramble.ts)
// Strict implementation of scrambleReveal(el, target, progress) from Build Bible v4 section 8.2

const GLYPHS = ['░', '▒', '▓', '~', '#', '*', '?', '%', '/', '+', '!', '^'];

/**
 * Deterministically scramble or reveal text into an element based on progress (0.0 to 1.0).
 *
 * @param element Target HTMLElement to render into
 * @param targetText The clean target string to eventually reveal
 * @param progress Value from 0.0 (fully scrambled) to 1.0 (fully clean)
 */
export function scrambleReveal(
  element: HTMLElement,
  targetText: string,
  progress: number
): void {
  const clamped = Math.max(0, Math.min(1, progress));

  // If fully revealed or reduced-motion is requested, output clean text
  if (clamped >= 1) {
    if (element.textContent !== targetText) {
      element.textContent = targetText;
    }
    return;
  }

  const length = targetText.length;
  if (length === 0) {
    element.textContent = '';
    return;
  }

  // Number of leading characters that should be clean
  const cleanCount = Math.floor(length * clamped);

  let output = '';
  for (let i = 0; i < length; i++) {
    const char = targetText[i];
    if (i < cleanCount) {
      output += char;
    } else if (char === ' ' || char === '\n' || char === '\t') {
      output += char;
    } else {
      // Deterministic pseudo-random glyph based on index and progress
      const glyphIndex = (i * 7 + Math.floor(clamped * 100)) % GLYPHS.length;
      output += GLYPHS[glyphIndex];
    }
  }

  element.textContent = output;
}
