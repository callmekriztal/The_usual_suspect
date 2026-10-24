// DEAD PIXELS - Content: Surveillance Photos Metadata (src/content/photos.ts)
// Verbatim from Build Bible v4 section 7.7

export interface PhotoRecord {
  id: string;
  filename: string;
  taken: string;
  device: string;
  place: string;
  subject: string;
  gps: string;
  net?: string;
  rawInspect: string;
}

export const PHOTOS: PhotoRecord[] = [
  {
    id: 'photo:img_0909_1810',
    filename: 'IMG_0909_1810.jpg',
    taken: '2026-09-09 18:10',
    device: 'DEV-7F3A',
    place: 'campus road, opposite block C',
    subject: 'hostel building C, exterior',
    gps: '12.9716° N, 77.5946° E (generic)',
    rawInspect: `file:    IMG_0909_1810.jpg
taken:   2026-09-09 18:10
device:  DEV-7F3A
place:   campus road, opposite block C
subject: hostel building C, exterior`,
  },
  {
    id: 'photo:img_0910_2105',
    filename: 'IMG_0910_2105.jpg',
    taken: '2026-09-10 21:05',
    device: 'DEV-7F3A',
    place: 'campus road, opposite block C',
    subject: 'third-floor window, dark',
    gps: '12.9716° N, 77.5946° E (generic)',
    rawInspect: `file:    IMG_0910_2105.jpg
taken:   2026-09-10 21:05
device:  DEV-7F3A
place:   campus road, opposite block C
subject: third-floor window, dark`,
  },
  {
    id: 'photo:img_0911_1752',
    filename: 'IMG_0911_1752.jpg',
    taken: '2026-09-11 17:52',
    device: 'DEV-7F3A',
    place: 'campus road, opposite block C',
    subject: 'third-floor window',
    gps: '12.9716° N, 77.5946° E (generic)',
    rawInspect: `file:    IMG_0911_1752.jpg
taken:   2026-09-11 17:52
device:  DEV-7F3A
place:   campus road, opposite block C
subject: third-floor window`,
  },
  {
    id: 'photo:img_0912_1940',
    filename: 'IMG_0912_1940.jpg',
    taken: '2026-09-12 19:40',
    device: 'DEV-7F3A',
    place: 'campus perimeter, north gate',
    subject: 'library walkway',
    gps: '12.9716° N, 77.5946° E (generic)',
    rawInspect: `file:    IMG_0912_1940.jpg
taken:   2026-09-12 19:40
device:  DEV-7F3A
place:   campus perimeter, north gate
subject: library walkway`,
  },
  {
    id: 'photo:img_0912_2115',
    filename: 'IMG_0912_2115.jpg',
    taken: '2026-09-12 21:15',
    device: 'DEV-7F3A',
    place: 'campus road, opposite block C',
    subject: 'block C entrance',
    gps: '12.9716° N, 77.5946° E (generic)',
    rawInspect: `file:    IMG_0912_2115.jpg
taken:   2026-09-12 21:15
device:  DEV-7F3A
place:   campus road, opposite block C
subject: block C entrance`,
  },
  {
    id: 'photo:img_0912_2236',
    filename: 'IMG_0912_2236.jpg',
    taken: '2026-09-12 22:36',
    device: 'DEV-7F3A',
    net: 'SIM2 ...4471',
    place: 'campus road, opposite block C',
    subject: 'third-floor window, light on',
    gps: '12.9716° N, 77.5946° E (generic)',
    rawInspect: `file:    IMG_0912_2236.jpg
taken:   2026-09-12 22:36
device:  DEV-7F3A
net:     SIM2 ...4471
place:   campus road, opposite block C
subject: third-floor window, light on`,
  },
];
