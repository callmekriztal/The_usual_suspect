// DEAD PIXELS - File Explorer & Photos Application (src/ui/apps/files.ts)
// Strict implementation of Stage 8 from Build Bible v4 & approved plan

import { VirtualFileSystem, VFSStat } from '../../engine/vfs';
import { GameStateMachine } from '../../engine/state';
import { TokenRegistry } from '../../engine/tokens';
import { PHOTOS, PhotoRecord } from '../../content/photos';

export interface FilesAppOptions {
  container: HTMLElement;
  vfs: VirtualFileSystem;
  stateMachine: GameStateMachine;
  tokens: TokenRegistry;
}

export class FilesApp {
  private container: HTMLElement;
  private vfs: VirtualFileSystem;
  private stateMachine: GameStateMachine;
  private tokens: TokenRegistry;

  public getTokens(): TokenRegistry {
    return this.tokens;
  }

  private currentPath: string = '/home/adi/CASE_09';
  private selectedPhotoId: string = 'photo:img_0909_1810';
  private activeTab: 'photo' | 'inspect' = 'photo';
  private selectedEntryIndex: number = 0;
  private currentEntries: VFSStat[] = [];
  private unsubscribe?: () => void;
  private wasPhotosLocked: boolean = true;

  // DOM Elements
  private windowElement!: HTMLElement;
  private titleTextEl!: HTMLElement;
  private pathDisplayEl!: HTMLElement;
  private upBtnEl!: HTMLButtonElement;
  private noticeBannerEl!: HTMLElement;
  private entriesListEl!: HTMLElement;
  private previewPaneEl!: HTMLElement;
  private statusTextEl!: HTMLElement;
  private pinBtnEl?: HTMLButtonElement;

  constructor(options: FilesAppOptions) {
    this.container = options.container;
    this.vfs = options.vfs;
    this.stateMachine = options.stateMachine;
    this.tokens = options.tokens;
    this.wasPhotosLocked = !this.stateMachine.isPhotosUnlocked();
  }

  public mount(): void {
    this.windowElement = document.createElement('div');
    this.windowElement.id = 'app-files';
    this.windowElement.className = 'window files-window';
    this.windowElement.setAttribute('role', 'region');
    this.windowElement.setAttribute('aria-label', 'File Explorer and Evidence Photos');

    // Titlebar
    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';

    this.titleTextEl = document.createElement('span');
    this.titleTextEl.className = 'window-title';
    this.titleTextEl.textContent = 'FILES: ~/CASE_09';
    titlebar.appendChild(this.titleTextEl);

    const controls = document.createElement('div');
    controls.className = 'window-controls';

    const minBtn = document.createElement('button');
    minBtn.className = 'window-btn window-btn-min';
    minBtn.textContent = '_';
    minBtn.setAttribute('aria-label', 'Minimize Files');
    minBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.windowElement.classList.add('minimized');
    });
    controls.appendChild(minBtn);
    titlebar.appendChild(controls);
    this.windowElement.appendChild(titlebar);

    // Toolbar / Breadcrumb Bar
    const toolbar = document.createElement('div');
    toolbar.className = 'files-toolbar';

    this.upBtnEl = document.createElement('button');
    this.upBtnEl.className = 'files-btn';
    this.upBtnEl.textContent = '⮥ Up';
    this.upBtnEl.setAttribute('aria-label', 'Navigate up one directory');
    this.upBtnEl.addEventListener('click', () => this.navigateUp());
    toolbar.appendChild(this.upBtnEl);

    this.pathDisplayEl = document.createElement('div');
    this.pathDisplayEl.className = 'files-path-bar';
    this.pathDisplayEl.textContent = '~/CASE_09';
    toolbar.appendChild(this.pathDisplayEl);
    this.windowElement.appendChild(toolbar);

    // Notice Banner (for permission/lock feedback)
    this.noticeBannerEl = document.createElement('div');
    this.noticeBannerEl.className = 'files-notice-banner';
    this.noticeBannerEl.style.display = 'none';
    this.windowElement.appendChild(this.noticeBannerEl);

    // Main Two-Pane Container
    const mainContainer = document.createElement('div');
    mainContainer.className = 'files-container';

    // Left: File List Pane
    const listPane = document.createElement('div');
    listPane.className = 'files-list-pane';

    const listHeader = document.createElement('div');
    listHeader.className = 'files-list-header';
    listHeader.textContent = 'NAME / ATTRIBUTES';
    listPane.appendChild(listHeader);

    this.entriesListEl = document.createElement('div');
    this.entriesListEl.className = 'files-entries';
    this.entriesListEl.setAttribute('role', 'listbox');
    this.entriesListEl.setAttribute('aria-label', 'Directory entries');
    listPane.appendChild(this.entriesListEl);
    mainContainer.appendChild(listPane);

    // Right: Detail / Preview Pane
    this.previewPaneEl = document.createElement('div');
    this.previewPaneEl.className = 'files-preview-pane';
    mainContainer.appendChild(this.previewPaneEl);

    this.windowElement.appendChild(mainContainer);

    // Status Bar
    const statusBar = document.createElement('div');
    statusBar.className = 'files-status-bar';
    this.statusTextEl = document.createElement('span');
    this.statusTextEl.textContent = 'Ready';
    statusBar.appendChild(this.statusTextEl);
    this.windowElement.appendChild(statusBar);

    this.container.appendChild(this.windowElement);

    // Attach Keyboard Listeners
    this.attachKeyboardListeners();

    // Subscribe to StateMachine updates
    this.unsubscribe = this.stateMachine.subscribe(() => {
      this.handleStateChange();
    });

    // Initial navigation
    this.navigateTo(this.currentPath);
  }

  public getWindowElement(): HTMLElement {
    return this.windowElement;
  }

  public getCurrentPath(): string {
    return this.currentPath;
  }

  public getSelectedPhotoId(): string {
    return this.selectedPhotoId;
  }

  public getActiveTab(): 'photo' | 'inspect' {
    return this.activeTab;
  }

  public navigateTo(targetPath: string): boolean {
    this.hideNotice();
    const canonical = this.vfs.resolvePath(targetPath);
    const node = this.vfs.getNode(canonical);

    if (!node) {
      this.showNotice(`Cannot access '${targetPath}': No such file or directory`);
      return false;
    }

    if (!node.isDirectory) {
      this.showNotice(`Cannot open '${targetPath}': Not a directory`);
      return false;
    }

    // Check directory lock
    if (node.isLocked) {
      this.showNotice(`Permission denied: ${node.lockReason || 'directory locked.'}`);
      return false;
    }

    this.currentPath = canonical;
    this.selectedEntryIndex = 0;

    // Update path displays
    const displayPath = this.getDisplayPath(canonical);
    this.pathDisplayEl.textContent = displayPath;
    this.titleTextEl.textContent = `FILES: ${displayPath}`;

    // Update Up button disabled state
    this.upBtnEl.disabled = (canonical === '/home/adi' || canonical === '/');

    // Progression Gate: Opening photos/ raises truth to 2
    if (canonical === '/home/adi/CASE_09/evidence/photos') {
      if (this.stateMachine.isPhotosUnlocked()) {
        this.stateMachine.openPhotos();
      }
    }

    this.renderDirectoryEntries();
    return true;
  }

  public navigateUp(): void {
    if (this.currentPath === '/home/adi' || this.currentPath === '/') return;
    const segments = this.currentPath.split('/').filter(Boolean);
    segments.pop();
    const parentPath = '/' + segments.join('/');
    this.navigateTo(parentPath);
  }

  private handleStateChange(): void {
    const isNowUnlocked = this.stateMachine.isPhotosUnlocked();
    if (this.wasPhotosLocked && isNowUnlocked) {
      this.wasPhotosLocked = false;
      // Re-render directory to trigger stepped lock drop animation
      this.renderDirectoryEntries(true);
    }

    // If currently viewing a photo, update pin button state
    if (this.pinBtnEl && this.isPhotoDirectory()) {
      const isPinned = this.stateMachine.getPins().has(this.selectedPhotoId);
      this.pinBtnEl.textContent = isPinned ? 'PINNED' : 'PIN PHOTO';
      if (isPinned) {
        this.pinBtnEl.classList.add('pinned');
      } else {
        this.pinBtnEl.classList.remove('pinned');
      }
    }
  }

  private isPhotoDirectory(): boolean {
    return this.currentPath === '/home/adi/CASE_09/evidence/photos';
  }

  private renderDirectoryEntries(animateLockDrop: boolean = false): void {
    const res = this.vfs.listDirectory(this.currentPath);
    this.currentEntries = res.entries || [];
    this.entriesListEl.innerHTML = '';

    if (this.currentEntries.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'files-entry';
      emptyEl.style.cursor = 'default';
      emptyEl.textContent = '(empty directory)';
      this.entriesListEl.appendChild(emptyEl);
      this.previewPaneEl.innerHTML = '<div class="text-file-preview">(no file selected)</div>';
      this.statusTextEl.textContent = '0 items';
      return;
    }

    this.statusTextEl.textContent = `${this.currentEntries.length} items`;

    this.currentEntries.forEach((entry, idx) => {
      const row = document.createElement('div');
      row.className = 'files-entry';
      row.setAttribute('role', 'option');
      row.setAttribute('tabindex', '0');
      row.setAttribute('data-path', entry.path);
      row.setAttribute('data-name', entry.name);

      if (idx === this.selectedEntryIndex) {
        row.classList.add('selected');
        row.setAttribute('aria-selected', 'true');
      } else {
        row.setAttribute('aria-selected', 'false');
      }

      const icon = document.createElement('span');
      icon.className = 'entry-icon';
      icon.textContent = entry.isDirectory ? '📁' : '📄';
      row.appendChild(icon);

      const name = document.createElement('span');
      name.className = 'entry-name';
      name.textContent = entry.name;
      row.appendChild(name);

      if (entry.isLocked) {
        const lockBadge = document.createElement('span');
        lockBadge.className = 'entry-badge locked';
        lockBadge.textContent = 'LOCKED';
        if (animateLockDrop && entry.name === 'photos') {
          lockBadge.classList.add('dropping');
        }
        row.appendChild(lockBadge);
      }

      row.addEventListener('click', () => {
        this.handleEntryClick(entry, idx);
      });

      this.entriesListEl.appendChild(row);
    });

    // Auto-display preview for selected entry
    const selectedEntry = this.currentEntries[this.selectedEntryIndex];
    if (selectedEntry) {
      this.showEntryPreview(selectedEntry);
    }
  }

  private handleEntryClick(entry: VFSStat, index: number): void {
    this.selectedEntryIndex = index;
    const rows = this.entriesListEl.querySelectorAll('.files-entry');
    rows.forEach((r, i) => {
      if (i === index) {
        r.classList.add('selected');
        r.setAttribute('aria-selected', 'true');
      } else {
        r.classList.remove('selected');
        r.setAttribute('aria-selected', 'false');
      }
    });

    if (entry.isDirectory) {
      this.navigateTo(entry.path);
    } else {
      this.showEntryPreview(entry);
    }
  }

  private showEntryPreview(entry: VFSStat): void {
    this.hideNotice();
    this.previewPaneEl.innerHTML = '';

    if (entry.isDirectory) {
      const dirEl = document.createElement('div');
      dirEl.className = 'text-file-preview';
      dirEl.textContent = `Directory: ${entry.name}/`;
      this.previewPaneEl.appendChild(dirEl);
      return;
    }

    // Check file lock
    if (entry.isLocked) {
      this.previewPaneEl.innerHTML = `
        <div class="text-file-preview" style="color: #b3382c;">
          <strong>🔒 PERMISSION DENIED</strong>
          <p>${this.escapeHtml(entry.lockReason || 'This file is locked and cannot be read.')}</p>
        </div>
      `;
      this.showNotice(`Permission denied: ${entry.lockReason || 'File locked.'}`);
      return;
    }

    if (this.isPhotoDirectory()) {
      const photo = PHOTOS.find((p) => p.filename === entry.name);
      if (photo) {
        this.selectedPhotoId = photo.id;
        this.renderPhotoViewer(photo);
        return;
      }
    }

    // Generic text file preview
    const res = this.vfs.readFile(entry.path);
    if (!res.success) {
      const errEl = document.createElement('div');
      errEl.className = 'text-file-preview';
      errEl.style.color = '#b3382c';
      errEl.textContent = res.error || 'Error reading file.';
      this.previewPaneEl.appendChild(errEl);
      return;
    }

    const header = document.createElement('div');
    header.className = 'photo-viewer-header';

    const filenameSpan = document.createElement('span');
    filenameSpan.className = 'photo-filename';
    filenameSpan.textContent = entry.name;
    header.appendChild(filenameSpan);

    const sizeSpan = document.createElement('span');
    sizeSpan.style.fontSize = '9px';
    sizeSpan.style.color = '#555';
    sizeSpan.textContent = `${res.content?.length || 0} bytes`;
    header.appendChild(sizeSpan);
    this.previewPaneEl.appendChild(header);

    const textPreview = document.createElement('div');
    textPreview.className = 'text-file-preview';
    textPreview.textContent = res.content || '';
    this.previewPaneEl.appendChild(textPreview);
  }

  private renderPhotoViewer(photo: PhotoRecord): void {
    this.previewPaneEl.innerHTML = '';

    // Header with filename, pin button, and tabs
    const header = document.createElement('div');
    header.className = 'photo-viewer-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'photo-title-group';

    const nameEl = document.createElement('span');
    nameEl.className = 'photo-filename';
    nameEl.textContent = photo.filename;
    titleGroup.appendChild(nameEl);

    // Pin Photo Button
    const isPinned = this.stateMachine.getPins().has(photo.id);
    this.pinBtnEl = document.createElement('button');
    this.pinBtnEl.className = `photo-pin-btn ${isPinned ? 'pinned' : ''}`;
    this.pinBtnEl.textContent = isPinned ? 'PINNED' : 'PIN PHOTO';
    this.pinBtnEl.setAttribute('aria-label', `Pin ${photo.filename} to Evidence Board`);
    this.pinBtnEl.addEventListener('click', () => {
      this.pinCurrentPhoto(photo.id);
    });
    titleGroup.appendChild(this.pinBtnEl);
    header.appendChild(titleGroup);

    // Tabs: Photo View vs. Metadata (EXIF)
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'photo-tabs';
    tabsContainer.setAttribute('role', 'tablist');

    const photoTab = document.createElement('button');
    photoTab.className = `photo-tab ${this.activeTab === 'photo' ? 'active' : ''}`;
    photoTab.textContent = 'PHOTO VIEW';
    photoTab.setAttribute('role', 'tab');
    photoTab.setAttribute('aria-selected', this.activeTab === 'photo' ? 'true' : 'false');
    photoTab.setAttribute('tabindex', this.activeTab === 'photo' ? '0' : '-1');
    photoTab.addEventListener('click', () => this.setTab('photo', photo));

    const inspectTab = document.createElement('button');
    inspectTab.className = `photo-tab ${this.activeTab === 'inspect' ? 'active' : ''}`;
    inspectTab.textContent = 'METADATA (EXIF)';
    inspectTab.setAttribute('role', 'tab');
    inspectTab.setAttribute('aria-selected', this.activeTab === 'inspect' ? 'true' : 'false');
    inspectTab.setAttribute('tabindex', this.activeTab === 'inspect' ? '0' : '-1');
    inspectTab.addEventListener('click', () => this.setTab('inspect', photo));

    tabsContainer.appendChild(photoTab);
    tabsContainer.appendChild(inspectTab);
    header.appendChild(tabsContainer);

    this.previewPaneEl.appendChild(header);

    // Body content according to active tab
    const body = document.createElement('div');
    body.className = 'photo-viewer-body';
    body.setAttribute('role', 'tabpanel');

    if (this.activeTab === 'photo') {
      body.appendChild(this.createPhotoViewElement(photo));
    } else {
      body.appendChild(this.createMetadataViewElement(photo));
    }

    this.previewPaneEl.appendChild(body);
  }

  public setTab(tab: 'photo' | 'inspect', photo?: PhotoRecord): void {
    this.activeTab = tab;
    const currentPhoto = photo || PHOTOS.find((p) => p.id === this.selectedPhotoId);
    if (currentPhoto) {
      this.renderPhotoViewer(currentPhoto);
    }
  }

  private pinCurrentPhoto(photoId: string): void {
    this.stateMachine.pin(photoId);
    if (this.pinBtnEl) {
      this.pinBtnEl.textContent = 'PINNED';
      this.pinBtnEl.classList.add('pinned');
    }
  }

  private createPhotoViewElement(photo: PhotoRecord): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'photo-frame-wrap';

    const viewport = document.createElement('div');
    viewport.className = 'surveillance-viewport';

    // Top OSD Overlay
    const osdTop = document.createElement('div');
    osdTop.className = 'surveillance-osd-top';
    osdTop.innerHTML = `<span>REC · CAM_EXT</span><span>${this.escapeHtml(photo.taken)}</span>`;
    viewport.appendChild(osdTop);

    // Unique SVG Scene Visual
    const svgScene = this.generateSurveillanceSvg(photo);
    viewport.appendChild(svgScene);

    // Bottom OSD Overlay
    const osdBottom = document.createElement('div');
    osdBottom.className = 'surveillance-osd-bottom';
    osdBottom.innerHTML = `<span>LOC: BLOCK_C_ROAD</span><span>DEV: ${this.escapeHtml(photo.device)}</span>`;
    viewport.appendChild(osdBottom);

    wrap.appendChild(viewport);

    // Case stamp under photo
    const metaBar = document.createElement('div');
    metaBar.className = 'photo-meta-bar';

    const stamp = document.createElement('span');
    stamp.className = 'case-stamp';
    stamp.setAttribute('data-case', 'EXHIBIT: SURVEILLANCE PHOTO');
    stamp.setAttribute('data-real', `photo you took, ${photo.taken}`);
    stamp.textContent = 'EXHIBIT: SURVEILLANCE PHOTO';
    metaBar.appendChild(stamp);

    const subjectBadge = document.createElement('span');
    subjectBadge.style.fontSize = '9px';
    subjectBadge.style.color = '#778877';
    subjectBadge.textContent = photo.subject;
    metaBar.appendChild(subjectBadge);

    wrap.appendChild(metaBar);
    return wrap;
  }

  private createMetadataViewElement(photo: PhotoRecord): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'metadata-panel';

    const table = document.createElement('table');
    table.className = 'metadata-table';

    const rows: Array<{ label: string; value: string; isToken?: boolean; token?: string; highlight?: boolean }> = [
      { label: 'file:', value: photo.filename },
      { label: 'taken:', value: photo.taken },
      { label: 'device:', value: photo.device, isToken: true, token: 'DEV-7F3A', highlight: true },
    ];

    if (photo.net) {
      rows.push({
        label: 'net:',
        value: photo.net,
        isToken: true,
        token: '4471',
        highlight: true,
      });
    }

    rows.push(
      { label: 'place:', value: photo.place },
      { label: 'subject:', value: photo.subject }
    );

    for (const r of rows) {
      const tr = document.createElement('tr');
      const tdLabel = document.createElement('td');
      tdLabel.className = 'metadata-label';
      tdLabel.textContent = r.label;
      tr.appendChild(tdLabel);

      const tdVal = document.createElement('td');
      tdVal.className = `metadata-value ${r.highlight ? 'highlight' : ''}`;

      if (r.isToken && r.token) {
        const tokenSpan = document.createElement('span');
        tokenSpan.className = 'terminal-token';
        tokenSpan.setAttribute('data-tok', r.token);
        tokenSpan.setAttribute('role', 'button');
        tokenSpan.setAttribute('tabindex', '0');
        tokenSpan.textContent = r.value;
        tdVal.appendChild(tokenSpan);
      } else {
        tdVal.textContent = r.value;
      }

      tr.appendChild(tdVal);
      table.appendChild(tr);
    }

    panel.appendChild(table);
    return panel;
  }

  private generateSurveillanceSvg(photo: PhotoRecord): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 320 220');
    svg.setAttribute('class', 'surveillance-svg');
    svg.setAttribute('aria-label', `Surveillance photo: ${photo.subject}`);

    // Base background & scanlines
    let content = `
      <rect width="320" height="220" fill="#0d100e"/>
      <line x1="0" y1="180" x2="320" y2="180" stroke="#232b27" stroke-width="2"/>
      <line x1="0" y1="195" x2="320" y2="195" stroke="#1c2420" stroke-width="1"/>
    `;

    // Scene differentiation based on photo ID
    switch (photo.id) {
      case 'photo:img_0909_1810':
        // Wide exterior: 3-story concrete hostel facade across road, daytime sky
        content += `
          <rect x="40" y="40" width="240" height="140" fill="#18211c" stroke="#314238" stroke-width="1"/>
          <!-- Windows grid -->
          <g fill="#0e1310">
            <rect x="60" y="60" width="24" height="20"/>
            <rect x="100" y="60" width="24" height="20"/>
            <rect x="140" y="60" width="24" height="20"/>
            <rect x="180" y="60" width="24" height="20"/>
            <rect x="220" y="60" width="24" height="20"/>
            <rect x="60" y="100" width="24" height="20"/>
            <rect x="100" y="100" width="24" height="20"/>
            <rect x="140" y="100" width="24" height="20"/>
            <rect x="180" y="100" width="24" height="20"/>
            <rect x="220" y="100" width="24" height="20"/>
          </g>
          <!-- Road curb -->
          <line x1="20" y1="185" x2="300" y2="185" stroke="#314238" stroke-width="1" stroke-dasharray="8 6"/>
        `;
        break;

      case 'photo:img_0910_2105':
        // Night angle: Close up corner window on 3rd floor, dark window pane
        content += `
          <rect width="320" height="220" fill="#050706"/>
          <rect x="60" y="30" width="200" height="150" fill="#141a17" stroke="#25302a" stroke-width="2"/>
          <!-- 3rd floor corner window - dark -->
          <rect x="110" y="55" width="100" height="100" fill="#040505" stroke="#3a4b42" stroke-width="2"/>
          <line x1="160" y1="55" x2="160" y2="155" stroke="#1c2521" stroke-width="2"/>
          <line x1="110" y1="105" x2="210" y2="105" stroke="#1c2521" stroke-width="2"/>
        `;
        break;

      case 'photo:img_0911_1752':
        // Late afternoon dusk: 3rd floor window with curtains visible
        content += `
          <rect width="320" height="220" fill="#1c160c"/>
          <rect x="60" y="30" width="200" height="150" fill="#2b2014" stroke="#4a3722" stroke-width="2"/>
          <!-- 3rd floor corner window - dusk curtain -->
          <rect x="110" y="55" width="100" height="100" fill="#120e09" stroke="#5a452c" stroke-width="2"/>
          <path d="M 115 55 Q 130 105 115 155 L 140 155 L 140 55 Z" fill="#2e2216"/>
          <path d="M 205 55 Q 190 105 205 155 L 180 155 L 180 55 Z" fill="#2e2216"/>
          <line x1="160" y1="55" x2="160" y2="155" stroke="#3d2d1b" stroke-width="2"/>
        `;
        break;

      case 'photo:img_0912_1940':
        // Perimeter north gate & walkway from library
        content += `
          <rect width="320" height="220" fill="#0a0e0c"/>
          <!-- Lamp post -->
          <line x1="80" y1="50" x2="80" y2="180" stroke="#4a5f53" stroke-width="3"/>
          <circle cx="80" cy="50" r="8" fill="#d9a441" opacity="0.8"/>
          <polygon points="80,55 30,180 130,180" fill="#d9a441" opacity="0.12"/>
          <!-- Fence railing -->
          <line x1="140" y1="120" x2="300" y2="120" stroke="#25302a" stroke-width="2"/>
          <line x1="140" y1="150" x2="300" y2="150" stroke="#25302a" stroke-width="2"/>
          <g stroke="#25302a" stroke-width="1.5">
            <line x1="160" y1="100" x2="160" y2="180"/>
            <line x1="190" y1="100" x2="190" y2="180"/>
            <line x1="220" y1="100" x2="220" y2="180"/>
            <line x1="250" y1="100" x2="250" y2="180"/>
            <line x1="280" y1="100" x2="280" y2="180"/>
          </g>
        `;
        break;

      case 'photo:img_0912_2115':
        // Block C entrance ground level door and porch
        content += `
          <rect width="320" height="220" fill="#070a08"/>
          <!-- Building base -->
          <rect x="50" y="50" width="220" height="130" fill="#151d18" stroke="#28372f" stroke-width="2"/>
          <!-- Entrance canopy -->
          <polygon points="100,80 220,80 240,100 80,100" fill="#1e2922" stroke="#3c5246" stroke-width="1.5"/>
          <!-- Security door -->
          <rect x="125" y="100" width="70" height="80" fill="#0a0e0b" stroke="#3c5246" stroke-width="1.5"/>
          <circle cx="160" cy="90" r="4" fill="#ffd578" opacity="0.9"/>
          <polygon points="160,95 120,180 200,180" fill="#ffd578" opacity="0.15"/>
        `;
        break;

      case 'photo:img_0912_2236':
      default:
        // PIVOTAL PHOTO: 3rd floor window, LIGHT ON!
        content += `
          <rect width="320" height="220" fill="#040605"/>
          <rect x="60" y="30" width="200" height="150" fill="#141a17" stroke="#25302a" stroke-width="2"/>
          <!-- 3rd floor corner window - BRIGHT LIGHT ON! -->
          <rect x="110" y="55" width="100" height="100" fill="#f7e199" stroke="#d9a441" stroke-width="2"/>
          <rect x="112" y="57" width="96" height="96" fill="#fff5cc" opacity="0.85"/>
          <!-- Silhouette in window -->
          <path d="M 145 130 C 145 110, 175 110, 175 130 Z" fill="#2b2313" opacity="0.75"/>
          <circle cx="160" cy="105" r="9" fill="#2b2313" opacity="0.75"/>
          <!-- Window frame divider -->
          <line x1="160" y1="55" x2="160" y2="155" stroke="#7a5b1f" stroke-width="2"/>
          <line x1="110" y1="105" x2="210" y2="105" stroke="#7a5b1f" stroke-width="2"/>
          <!-- Light casting out onto sill and road -->
          <polygon points="110,155 210,155 270,220 50,220" fill="#d9a441" opacity="0.12"/>
        `;
        break;
    }

    svg.innerHTML = content;
    return svg;
  }

  private attachKeyboardListeners(): void {
    this.windowElement.addEventListener('keydown', (e: KeyboardEvent) => {
      // Tab navigation between tabs when focused on tabs
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const activeTabEl = this.windowElement.querySelector('.photo-tab:focus');
        if (activeTabEl) {
          e.preventDefault();
          const newTab = this.activeTab === 'photo' ? 'inspect' : 'photo';
          this.setTab(newTab);
          const nextTabEl = this.windowElement.querySelector(`.photo-tab[aria-selected="true"]`) as HTMLElement | null;
          nextTabEl?.focus();
          return;
        }
      }

      // Arrow navigation within directory entries
      if (e.key === 'ArrowDown') {
        if (this.currentEntries.length > 0) {
          e.preventDefault();
          const nextIdx = Math.min(this.currentEntries.length - 1, this.selectedEntryIndex + 1);
          this.handleEntryClick(this.currentEntries[nextIdx], nextIdx);
          this.focusEntry(nextIdx);
        }
      } else if (e.key === 'ArrowUp') {
        if (this.currentEntries.length > 0) {
          e.preventDefault();
          const prevIdx = Math.max(0, this.selectedEntryIndex - 1);
          this.handleEntryClick(this.currentEntries[prevIdx], prevIdx);
          this.focusEntry(prevIdx);
        }
      } else if (e.key === 'Enter') {
        const focusedEntry = document.activeElement?.closest('.files-entry') as HTMLElement | null;
        if (focusedEntry) {
          e.preventDefault();
          focusedEntry.click();
        }
      }
    });
  }

  private focusEntry(index: number): void {
    const rows = this.entriesListEl.querySelectorAll('.files-entry');
    const target = rows[index] as HTMLElement | null;
    target?.focus();
  }

  private showNotice(msg: string, isInfo: boolean = false): void {
    this.noticeBannerEl.textContent = msg;
    this.noticeBannerEl.className = `files-notice-banner ${isInfo ? 'info' : ''}`;
    this.noticeBannerEl.style.display = 'flex';
  }

  private hideNotice(): void {
    this.noticeBannerEl.style.display = 'none';
  }

  private getDisplayPath(canonical: string): string {
    if (canonical === '/home/adi') return '~';
    if (canonical.startsWith('/home/adi/')) {
      return '~/' + canonical.slice('/home/adi/'.length);
    }
    return canonical;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public unmount(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
    if (this.windowElement.parentElement) {
      this.windowElement.parentElement.removeChild(this.windowElement);
    }
  }
}
