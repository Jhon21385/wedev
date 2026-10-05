import type { ToolkitDefinition, ToolkitId } from './types'

/* ============================================================================
   TOOLKIT REGISTRY

   Everything the composer needs to know about a platform, in one place:
   the fields it asks for, the limits it enforces, what it can publish, and
   the Composio tool slugs that carry it out.

   Slugs are listed in preference order. Composio renames and version-tools
   over time, so the live adapter tries them in order and reports which ones
   resolve (Settings → Connections → Verify tools). A slug that stops existing
   becomes a visible warning, never a silent publish failure.
   ========================================================================== */

const YOUTUBE: ToolkitDefinition = {
  id: 'youtube',
  platform: 'youtube',
  toolkitSlug: 'youtube',
  authScheme: 'OAUTH2',
  scopes: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ],
  publishNoun: 'video',
  capabilities: {
    media: ['video', 'short'],
    supportsScheduling: true,
    supportsThumbnail: true,
    supportsFirstComment: false,
    supportsCarousel: false,
    supportsAltText: false,
    scheduleNote: 'YouTube publishes scheduled videos natively — Creator OS hands the timestamp over rather than holding a queue.',
  },
  fields: [
    { id: 'title', label: 'Title', kind: 'text', limit: 100, recommended: 60, required: true, hint: 'Under ~60 characters survives truncation on every surface.', placeholder: 'How I built my first AI agent' },
    {
      id: 'description',
      label: 'Description',
      kind: 'textarea',
      limit: 5000,
      recommended: 900,
      required: true,
      hint: 'First two lines appear above the fold. Put the payoff there, links below.',
      placeholder: 'One paragraph on what the viewer leaves with…',
    },
    { id: 'tags', label: 'Tags', kind: 'tags', limit: 500, maxItems: 15, hint: 'Comma separated. 500 characters total across all tags.' },
    { id: 'thumbnail', label: 'Thumbnail', kind: 'media', hint: '1280×720, under 2 MB. The single largest lever on click-through.' },
    {
      id: 'visibility',
      label: 'Visibility',
      kind: 'select',
      required: true,
      options: [
        { id: 'private', label: 'Private', hint: 'Only you — use while the edit settles' },
        { id: 'unlisted', label: 'Unlisted', hint: 'Anyone with the link, not in feeds' },
        { id: 'public', label: 'Public', hint: 'Live in feeds and subscriptions' },
      ],
    },
    { id: 'playlist', label: 'Playlist', kind: 'select', options: [{ id: 'none', label: 'No playlist' }, { id: 'ai-agents', label: 'AI Agents' }, { id: 'build-log', label: 'Build log' }, { id: 'saas-30', label: 'SaaS in 30 days' }] },
    { id: 'madeForKids', label: 'Made for kids', kind: 'toggle', hint: 'Affects comments, ads and personalisation. Almost always no for a technical channel.' },
    { id: 'scheduledFor', label: 'Publish at', kind: 'datetime' },
  ],
  tools: {
    publish: ['YOUTUBE_UPLOAD_VIDEO', 'YOUTUBE_MULTIPART_UPLOAD_VIDEO'],
    media: ['YOUTUBE_UPDATE_THUMBNAIL'],
    metadata: ['YOUTUBE_UPDATE_VIDEO_METADATA'],
  },
  sourceHints: { title: 'title', body: 'caption' },
}

const INSTAGRAM: ToolkitDefinition = {
  id: 'instagram',
  platform: 'instagram',
  toolkitSlug: 'instagram',
  authScheme: 'OAUTH2',
  scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'],
  publishNoun: 'post',
  capabilities: {
    media: ['reel', 'image', 'carousel', 'story'],
    supportsScheduling: true,
    supportsThumbnail: true,
    supportsFirstComment: true,
    supportsCarousel: true,
    supportsAltText: true,
    scheduleNote: 'Scheduling runs through the Instagram Graph API and needs a Business or Creator account.',
  },
  fields: [
    {
      id: 'caption',
      label: 'Caption',
      kind: 'textarea',
      limit: 2200,
      recommended: 125,
      required: true,
      hint: 'Instagram truncates at ~125 characters. Lead with the hook.',
      placeholder: 'I built an AI agent that books my calls…',
    },
    { id: 'hashtags', label: 'Hashtags', kind: 'tags', maxItems: 30, hint: 'Up to 30. Mix reach tiers rather than repeating the biggest ones.' },
    { id: 'media', label: 'Media', kind: 'media', required: true },
    { id: 'coverFrame', label: 'Cover frame', kind: 'select', showForMedia: ['reel', 'carousel'], options: [{ id: 'auto', label: 'Auto-selected frame' }, { id: 'thumb', label: 'Use channel thumbnail' }, { id: 'manual', label: 'Pick a frame' }] },
    { id: 'firstComment', label: 'First comment', kind: 'textarea', limit: 2200, hint: 'Keeps the caption clean while carrying link or extra context.' },
    { id: 'altText', label: 'Alt text', kind: 'text', limit: 100, hint: 'Describes the media for screen readers and improves reach.' },
    { id: 'shareToFeed', label: 'Also share to feed', kind: 'toggle', showForMedia: ['reel'] },
    { id: 'location', label: 'Location', kind: 'text', limit: 64 },
    { id: 'scheduledFor', label: 'Publish at', kind: 'datetime' },
  ],
  tools: {
    publish: ['INSTAGRAM_CREATE_POST'],
    prepare: ['INSTAGRAM_CREATE_MEDIA_CONTAINER', 'INSTAGRAM_CREATE_CAROUSEL_CONTAINER'],
  },
  sourceHints: { body: 'caption' },
}

const LINKEDIN: ToolkitDefinition = {
  id: 'linkedin',
  platform: 'linkedin',
  toolkitSlug: 'linkedin',
  authScheme: 'OAUTH2',
  scopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress', 'rw_organization_admin'],
  publishNoun: 'post',
  capabilities: {
    media: ['text', 'image', 'video', 'document'],
    supportsScheduling: false,
    supportsThumbnail: false,
    supportsFirstComment: false,
    supportsCarousel: false,
    supportsAltText: false,
    scheduleNote: 'LinkedIn has no first-party scheduling scope, so Creator OS publishes immediately and records the intent.',
  },
  fields: [
    {
      id: 'commentary',
      label: 'Post',
      kind: 'textarea',
      limit: 3000,
      recommended: 2100,
      required: true,
      hint: 'The first three lines carry the whole post — everything after sits behind "see more".',
      placeholder: 'Nine days, four failures, $11 in tokens. Here is the architecture…',
    },
    { id: 'media', label: 'Media', kind: 'media', showForMedia: ['image', 'video', 'document'] },
    { id: 'link', label: 'Link', kind: 'text', limit: 2083, showForMedia: ['text'], hint: 'Native video or no link performs best; external links are demoted in the feed.' },
    {
      id: 'visibility',
      label: 'Audience',
      kind: 'select',
      required: true,
      options: [
        { id: 'PUBLIC', label: 'Anyone', hint: 'Widest reach' },
        { id: 'CONNECTIONS', label: 'Connections only', hint: 'Narrower, higher intent' },
        { id: 'LOGGED_IN', label: 'Logged-in members', hint: 'Excludes logged-out readers' },
      ],
    },
    { id: 'postAsOrg', label: 'Post as organisation', kind: 'toggle', hint: 'Needs rw_organization_admin and a page you administer.' },
  ],
  tools: {
    publish: ['LINKEDIN_CREATE_POST'],
    media: ['LINKEDIN_CREATE_IMAGE_POST', 'LINKEDIN_CREATE_VIDEO_POST', 'LINKEDIN_CREATE_DOCUMENT_POST'],
  },
  sourceHints: { body: 'body' },
}

export const TOOLKITS: ToolkitDefinition[] = [YOUTUBE, INSTAGRAM, LINKEDIN]

export const TOOLKIT_BY_ID: Record<ToolkitId, ToolkitDefinition> = {
  youtube: YOUTUBE,
  instagram: INSTAGRAM,
  linkedin: LINKEDIN,
}

/** The three platforms the product ships with, in nav order. */
export const LIVE_TOOLKIT_IDS: ToolkitId[] = ['youtube', 'instagram', 'linkedin']

export function toolkitDef(id: ToolkitId): ToolkitDefinition {
  return TOOLKIT_BY_ID[id]
}

/** Default media type per toolkit — the first capability in the list. */
export function defaultMediaType(id: ToolkitId): string {
  return toolkitDef(id).capabilities.media[0]
}

/** Fields relevant to the currently chosen media type. */
export function fieldsFor(id: ToolkitId, mediaType: string): ToolkitDefinition['fields'] {
  return toolkitDef(id).fields.filter((f) => !f.showForMedia || f.showForMedia.includes(mediaType))
}

/** Empty value map for a toolkit, using whatever defaults the schema implies. */
export function emptyValues(id: ToolkitId): Record<string, string | string[] | boolean> {
  const out: Record<string, string | string[] | boolean> = {}
  for (const f of toolkitDef(id).fields) {
    if (f.kind === 'toggle') out[f.id] = false
    else if (f.kind === 'tags') out[f.id] = []
    else if (f.kind === 'select') out[f.id] = f.options?.[0]?.id ?? ''
    else out[f.id] = ''
  }
  return out
}

export const STATUS_META: Record<string, { label: string; tone: 'neutral' | 'accent' | 'success' | 'warn' | 'danger' | 'outline' }> = {
  disconnected: { label: 'Not connected', tone: 'neutral' },
  pending: { label: 'Connecting…', tone: 'accent' },
  active: { label: 'Connected', tone: 'success' },
  expired: { label: 'Reconnect needed', tone: 'warn' },
  unconfigured: { label: 'Not configured', tone: 'outline' },
  error: { label: 'Error', tone: 'danger' },
}
