import type { Asset } from '../types'

/* ============================================================================
   ASSET LIBRARY
   Real filenames, real folders, real-ish sizes. `usedIn` links back to content
   so the library is a graph, not a dumping ground.
   ========================================================================== */
const A = (
  id: string,
  name: string,
  kind: Asset['kind'],
  mime: string,
  size: number,
  seed: number,
  folder: string,
  tags: string[],
  usedIn: string[],
  dims?: string,
  duration?: string,
): Asset => ({ id, name, kind, mime, size, seed, folder, tags, usedIn, dims, duration, createdAt: '' })

export const ASSETS: Asset[] = [
  // --- Video -----------------------------------------------------------------
  A('as-v01', 'agent-build-final-v7.mp4', 'video', 'video/mp4', 3_842_000_000, 101, 'Videos/Agent Build', ['agent', 'final', 'master'], ['ct-agent'], '3840×2160', '22:14'),
  A('as-v02', 'india-documentary-master.mp4', 'video', 'video/mp4', 5_118_000_000, 102, 'Videos/India Series', ['india', 'documentary', 'master'], ['ct-india'], '3840×2160', '34:52'),
  A('as-v03', 'codefaster-master.mp4', 'video', 'video/mp4', 2_640_000_000, 103, 'Videos/2026', ['ai coding', 'master'], ['ct-codefaster'], '2560×1440', '18:06'),
  A('as-v04', 'saas30-final.mp4', 'video', 'video/mp4', 2_910_000_000, 104, 'Videos/2026', ['saas', 'final'], ['ct-saas30'], '2560×1440', '21:40'),
  A('as-v05', 'pipeline-edit-v3.mp4', 'video', 'video/mp4', 4_020_000_000, 105, 'Videos/In Progress', ['pipeline', 'wip'], ['ct-pipeline'], '3840×2160', '26:31'),
  A('as-v06', 'broll-indiranagar-street.mp4', 'video', 'video/mp4', 884_000_000, 106, 'B-roll/India', ['broll', 'street', 'india'], ['ct-india', 'ct-india-short'], '3840×2160', '4:12'),
  A('as-v07', 'broll-pune-warehouse.mp4', 'video', 'video/mp4', 712_000_000, 107, 'B-roll/India', ['broll', 'logistics'], ['ct-india'], '3840×2160', '3:48'),
  A('as-v08', 'screenrec-postgres-explain.mp4', 'video', 'video/mp4', 244_000_000, 108, 'Screen Recordings', ['postgres', 'explain'], ['ct-postgres'], '2560×1440', '7:22'),
  A('as-v09', 'screenrec-agent-loop.mp4', 'video', 'video/mp4', 168_000_000, 109, 'Screen Recordings', ['agent', 'code'], ['ct-agent', 'ct-agent-short'], '2560×1440', '2:41'),
  A('as-v10', 'screenrec-eval-harness.mp4', 'video', 'video/mp4', 302_000_000, 110, 'Screen Recordings', ['eval', 'terminal'], ['ct-vs'], '2560×1440', '9:05'),
  A('as-v11', 'interview-priya-a-cam.mp4', 'video', 'video/mp4', 2_180_000_000, 111, 'Podcast/Raw', ['interview', 'a-cam'], ['ct-podcast-1'], '3840×2160', '52:18'),
  A('as-v12', 'failure-wall-montage.mp4', 'video', 'video/mp4', 96_000_000, 112, 'Videos/Agent Build', ['montage', 'errors'], ['ct-agent'], '3840×2160', '0:14'),

  // --- Thumbnails ------------------------------------------------------------
  A('as-t01', 'agent-thumb-v4.png', 'thumbnail', 'image/png', 4_120_000, 201, 'Thumbnails/Published', ['thumbnail', 'ctr 9.4'], ['ct-agent'], '1280×720'),
  A('as-t02', 'automation-thumb-v2.png', 'thumbnail', 'image/png', 3_840_000, 202, 'Thumbnails/Published', ['thumbnail', 'ctr 7.1'], ['ct-automation'], '1280×720'),
  A('as-t03', 'saas30-thumb-v3.png', 'thumbnail', 'image/png', 3_960_000, 203, 'Thumbnails/Published', ['thumbnail', 'ctr 8.2'], ['ct-saas30'], '1280×720'),
  A('as-t04', 'india-thumb-v6.png', 'thumbnail', 'image/png', 4_480_000, 204, 'Thumbnails/Published', ['thumbnail', 'ctr 11.2'], ['ct-india'], '1280×720'),
  A('as-t05', 'codefaster-thumb-v2.png', 'thumbnail', 'image/png', 3_620_000, 205, 'Thumbnails/Published', ['thumbnail', 'ctr 8.8'], ['ct-codefaster'], '1280×720'),
  A('as-t06', 'mistake-thumb-v1.png', 'thumbnail', 'image/png', 3_310_000, 206, 'Thumbnails/Published', ['thumbnail', 'ctr 6.4'], ['ct-mistake'], '1280×720'),
  A('as-t07', 'pipeline-thumb-round2.png', 'thumbnail', 'image/png', 4_260_000, 207, 'Thumbnails/In Progress', ['thumbnail', 'draft'], ['ct-pipeline'], '1280×720'),
  A('as-t08', 'vs-thumb-ab-test.png', 'thumbnail', 'image/png', 4_010_000, 208, 'Thumbnails/In Progress', ['thumbnail', 'ab test'], ['ct-vs'], '1280×720'),
  A('as-t09', 'patterns-thumb-v1.png', 'thumbnail', 'image/png', 3_540_000, 209, 'Thumbnails/In Progress', ['thumbnail', 'draft'], ['ct-patterns'], '1280×720'),
  A('as-t10', 'youtube-thumbnail-template.fig', 'document', 'application/octet-stream', 18_400_000, 210, 'Brand/Templates', ['template', 'figma'], ['ct-pipeline', 'ct-vs'], '1920×1080'),

  // --- Images -----------------------------------------------------------------
  A('as-i01', 'studio-setup-wide.jpg', 'image', 'image/jpeg', 12_400_000, 301, 'Images/Studio', ['studio', 'lighting'], ['ct-codefaster'], '6000×4000'),
  A('as-i02', 'tiruppur-factory-floor.jpg', 'image', 'image/jpeg', 9_800_000, 302, 'Images/India', ['field', 'factory'], ['ct-india'], '5472×3648'),
  A('as-i03', 'bengaluru-skyline-dusk.jpg', 'image', 'image/jpeg', 8_200_000, 303, 'Images/India', ['field', 'city'], ['ct-india', 'ct-india-reel'], '6000×4000'),
  A('as-i04', 'diagram-agent-architecture.png', 'image', 'image/png', 1_840_000, 304, 'Images/Diagrams', ['diagram', 'agents'], ['ct-agent', 'ct-patterns'], '2400×1600'),
  A('as-i05', 'diagram-retention-shapes.png', 'image', 'image/png', 1_620_000, 305, 'Images/Diagrams', ['diagram', 'retention'], ['ct-delete40'], '2400×1600'),
  A('as-i06', 'diagram-failure-taxonomy.png', 'image', 'image/png', 1_980_000, 306, 'Images/Diagrams', ['diagram', 'reliability'], ['ct-demo-fails'], '2400×1600'),
  A('as-i07', 'carousel-15-automations-cover.png', 'image', 'image/png', 2_110_000, 307, 'Images/Carousels', ['carousel', 'cover'], ['ct-li-automations'], '1080×1350'),
  A('as-i08', 'carousel-agent-9-slides.zip', 'document', 'application/zip', 24_600_000, 308, 'Images/Carousels', ['carousel', 'slides'], ['ct-agent-carousel'], '1080×1350'),
  A('as-i09', 'portrait-interview-priya.jpg', 'image', 'image/jpeg', 7_400_000, 309, 'Images/People', ['portrait', 'guest'], ['ct-podcast-1'], '4000×6000'),
  A('as-i10', 'desk-macro-keyboard.jpg', 'image', 'image/jpeg', 6_900_000, 310, 'Images/Studio', ['macro', 'texture'], [], '6000×4000'),

  // --- Logo / brand -----------------------------------------------------------
  A('as-l01', 'creator-os-wordmark.svg', 'logo', 'image/svg+xml', 42_000, 401, 'Brand/Logo', ['logo', 'primary'], [], '1200×320'),
  A('as-l02', 'creator-os-mark-mono.svg', 'logo', 'image/svg+xml', 18_000, 402, 'Brand/Logo', ['logo', 'mono'], [], '512×512'),
  A('as-l03', 'creator-os-mark-glow.svg', 'logo', 'image/svg+xml', 24_000, 403, 'Brand/Logo', ['logo', 'glow'], [], '512×512'),
  A('as-l04', 'channel-avatar-2026.png', 'logo', 'image/png', 840_000, 404, 'Brand/Logo', ['avatar', 'youtube'], [], '800×800'),
  A('as-l05', 'linkedin-banner-2026.png', 'logo', 'image/png', 2_240_000, 405, 'Brand/Social', ['banner', 'linkedin'], [], '1584×396'),
  A('as-l06', 'ig-highlight-covers.zip', 'document', 'application/zip', 6_120_000, 406, 'Brand/Social', ['instagram', 'covers'], [], '1080×1920'),

  // --- Audio ------------------------------------------------------------------
  A('as-a01', 'agent-video-vo-take3.wav', 'audio', 'audio/wav', 486_000_000, 501, 'Audio/Voiceover', ['voiceover', 'final'], ['ct-agent'], undefined, '22:14'),
  A('as-a02', 'india-vo-take2.wav', 'audio', 'audio/wav', 712_000_000, 502, 'Audio/Voiceover', ['voiceover', 'final'], ['ct-india'], undefined, '34:52'),
  A('as-a03', 'podcast-mix-v4.wav', 'audio', 'audio/wav', 1_180_000_000, 503, 'Podcast/Mixes', ['podcast', 'mix'], ['ct-podcast-1'], undefined, '52:18'),
  A('as-a04', 'intro-sting-a.wav', 'music', 'audio/wav', 4_200_000, 504, 'Audio/Music', ['sting', 'intro'], ['ct-agent', 'ct-india', 'ct-codefaster'], undefined, '0:08'),
  A('as-a05', 'bed-tension-loop.wav', 'music', 'audio/wav', 28_400_000, 505, 'Audio/Music', ['bed', 'tension'], ['ct-india'], undefined, '3:20'),
  A('as-a06', 'bed-tech-minimal.wav', 'music', 'audio/wav', 31_200_000, 506, 'Audio/Music', ['bed', 'minimal'], ['ct-codefaster', 'ct-postgres'], undefined, '3:40'),
  A('as-a07', 'error-blips-pack.zip', 'audio', 'application/zip', 8_400_000, 507, 'Audio/SFX', ['sfx', 'ui'], ['ct-agent'], undefined, undefined),
  A('as-a08', 'room-tone-studio.wav', 'audio', 'audio/wav', 62_400_000, 508, 'Audio/SFX', ['room tone'], ['ct-podcast-1'], undefined, '6:00'),

  // --- Documents --------------------------------------------------------------
  A('as-d01', 'agent-eval-harness.zip', 'document', 'application/zip', 148_000_000, 601, 'Documents/Code', ['code', 'evals'], ['ct-agent', 'ct-vs'], undefined, undefined),
  A('as-d02', 'content-pipeline-workflow.json', 'document', 'application/json', 86_000, 602, 'Documents/Systems', ['workflow', 'automation'], ['ct-pipeline'], undefined, undefined),
  A('as-d03', 'sponsorship-rate-card-2026.pdf', 'document', 'application/pdf', 2_840_000, 603, 'Documents/Business', ['rates', 'deals'], ['ct-li-retainer'], undefined, undefined),
  A('as-d04', 'brand-guidelines-v3.pdf', 'document', 'application/pdf', 24_600_000, 604, 'Brand', ['guidelines', 'brand'], [], undefined, undefined),
  A('as-d05', 'q3-p&l-2026.xlsx', 'document', 'application/vnd.ms-excel', 1_240_000, 605, 'Documents/Business', ['finance', 'q3'], [], undefined, undefined),
  A('as-d06', 'india-field-notes.md', 'document', 'text/markdown', 64_000, 606, 'Documents/Research', ['notes', 'india'], ['ct-india'], undefined, undefined),
  A('as-d07', 'retention-curve-analysis.xlsx', 'document', 'application/vnd.ms-excel', 980_000, 607, 'Documents/Research', ['analytics', 'retention'], ['ct-delete40'], undefined, undefined),

  // --- Screenshots ------------------------------------------------------------
  A('as-s01', 'incident-log-sept.png', 'screenshot', 'image/png', 1_840_000, 701, 'Screenshots/Ops', ['incidents', 'ops'], ['ct-demo-fails'], '2880×1800'),
  A('as-s02', 'stripe-revenue-sept.png', 'screenshot', 'image/png', 1_420_000, 702, 'Screenshots/Business', ['revenue', 'stripe'], ['ct-saas30'], '2880×1800'),
  A('as-s03', 'yt-analytics-30day.png', 'screenshot', 'image/png', 2_180_000, 703, 'Screenshots/Analytics', ['youtube', 'analytics'], ['ct-delete40'], '3360×2100'),
  A('as-s04', 'token-cost-dashboard.png', 'screenshot', 'image/png', 1_960_000, 704, 'Screenshots/Ops', ['cost', 'tokens'], ['ct-ai-stack'], '2880×1800'),
  A('as-s05', 'comment-clusters.png', 'screenshot', 'image/png', 2_640_000, 705, 'Screenshots/Analytics', ['comments', 'clusters'], [], '3360×2100'),
  A('as-s06', 'edit-timeline-full.png', 'screenshot', 'image/png', 3_120_000, 706, 'Screenshots/Craft', ['editing', 'timeline'], ['ct-timeline'], '3840×1200'),
]
