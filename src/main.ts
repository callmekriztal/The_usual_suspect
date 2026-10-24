// DEAD PIXELS - Main Entry Point (Stage 0 Shell)

console.log('[DEAD PIXELS] System initialized. Stage 0 shell ready.');

export function initializeShell(): void {
  const bootScreen = document.getElementById('boot-screen');
  if (bootScreen) {
    bootScreen.innerHTML = `
      <div class="boot-text" style="padding: 20px; font-family: var(--font-mono); color: var(--term-fg); background: var(--term-bg); height: 100%;">
        <p>ADI-THINKPAD DEV-7F3A Thu 22 Oct 2026 23:52</p>
        <p>last session ended 23:41 (unclean)</p>
        <p>mirror.py: running</p>
        <p>battery 23% network: none</p>
      </div>
    `;
    // For Stage 0 shell verification, fade out boot after 500ms or keep minimal
    setTimeout(() => {
      bootScreen.style.display = 'none';
    }, 600);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeShell();
  });
}
