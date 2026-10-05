import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send, ThumbsUp } from 'lucide-react'
import { Avatar } from '@/components/ui/Surface'
import { cn } from '@/lib/cn'
import type { ConnectedAccount, ToolkitId } from '@/integrations/types'
import type { Creator } from '@/data/types'

/* ============================================================================
   NATIVE PREVIEWS
   Each platform renders as the platform, not as a generic card — the composer
   shows what the audience will actually see. They are static renderings: no
   network calls, no embeds, no tracking.
   ========================================================================== */

export interface PreviewProps {
  values: Record<string, string | string[] | boolean>
  mediaType: string
  creator: Creator
  account?: ConnectedAccount
}

const text = (v: string | string[] | boolean | undefined) => (typeof v === 'string' ? v : Array.isArray(v) ? v.join(' ') : '')
const list = (v: string | string[] | boolean | undefined) => (Array.isArray(v) ? v : [])

function Frame({ label, children, tone }: { label: string; children: React.ReactNode; tone: string }) {
  return (
    <div>
      <p className="cell-label mb-2">
        <span style={{ color: tone }}>{label}</span>
        <span className="text-ink-faint"> · native preview</span>
      </p>
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------- YouTube -- */

export function YouTubePreview({ values, mediaType, creator, account }: PreviewProps) {
  const title = text(values.title) || 'Untitled video'
  const isShort = mediaType === 'short'
  return (
    <Frame label="YouTube" tone="#FF5D55">
      <div className="overflow-hidden rounded-lg border border-line-2 bg-[#0F0F0F]">
        <div className={cn('relative w-full overflow-hidden bg-[#181818]', isShort ? 'aspect-[9/16]' : 'aspect-video')}>
          {values.thumbnail ? (
            <img src={text(values.thumbnail)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <span className="mono text-[10px] tracking-[0.12em] text-white/25">NO THUMBNAIL</span>
            </div>
          )}
          {isShort && (
            <span className="absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
              Shorts
            </span>
          )}
        </div>
        <div className="flex gap-2.5 p-2.5">
          <Avatar name={account?.accountName ?? creator.name} seed={account?.avatarSeed ?? creator.avatarSeed} size={30} />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-[#F1F1F1]">{title}</p>
            <p className="mt-0.5 truncate text-[11px] text-[#AAAAAA]">
              {account?.accountName ?? creator.name} · {text(values.visibility) === 'public' ? 'Scheduled' : 'Private'}
            </p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-ink-faint">
        {title.length > 60
          ? 'Titles over 60 characters truncate in search, subscriptions and the mobile feed.'
          : 'Title fits every YouTube surface without truncation.'}
      </p>
    </Frame>
  )
}

/* -------------------------------------------------------------- Instagram -- */

export function InstagramPreview({ values, mediaType, creator, account }: PreviewProps) {
  const caption = text(values.caption)
  const tags = list(values.hashtags)
  const full = [caption, ...tags].filter(Boolean).join(' ')
  const truncated = caption.length > 125
  return (
    <Frame label="Instagram" tone="#E079D8">
      <div className="overflow-hidden rounded-lg border border-line-2 bg-black">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Avatar name={account?.accountName ?? creator.name} seed={account?.avatarSeed ?? creator.avatarSeed} size={26} ring />
          <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-[#F5F5F5]">
            {account?.handle ?? creator.handle}
          </span>
          <MoreHorizontal className="h-3.5 w-3.5 text-[#F5F5F5]" />
        </div>
        <div className={cn('relative w-full bg-[#111]', mediaType === 'reel' || mediaType === 'story' ? 'aspect-[9/16]' : 'aspect-square')}>
          {values.media ? (
            <img src={text(values.media)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <span className="mono text-[10px] tracking-[0.12em] text-white/25">NO MEDIA</span>
            </div>
          )}
        </div>
        <div className="px-3 pb-3 pt-2">
          <div className="mb-2 flex items-center gap-3 text-[#F5F5F5]">
            <Heart className="h-4 w-4" />
            <MessageCircle className="h-4 w-4" />
            <Send className="h-4 w-4" />
            <Bookmark className="ml-auto h-4 w-4" />
          </div>
          <p className="text-[11.5px] leading-relaxed text-[#F5F5F5]">
            <span className="font-semibold">{account?.handle ?? creator.handle}</span>{' '}
            {truncated ? (
              <>
                {caption.slice(0, 125)}… <span className="text-[#A8A8A8]">more</span>
              </>
            ) : (
              caption || <span className="text-[#A8A8A8]">Write a caption…</span>
            )}
          </p>
          {tags.length > 0 && <p className="mt-1 text-[11.5px] leading-relaxed text-[#00376B]">{tags.join(' ')}</p>}
        </div>
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-ink-faint">
        {truncated
          ? 'Only the first 125 characters show before "more" — the hook has to land there.'
          : `${full.length} / 2200 characters used.`}
      </p>
    </Frame>
  )
}

/* --------------------------------------------------------------- LinkedIn -- */

export function LinkedInPreview({ values, creator, account }: PreviewProps) {
  const body = text(values.commentary)
  const visible = body.length > 210 ? `${body.slice(0, 210).trimEnd()}…` : body
  const visibilityLabel = { PUBLIC: 'Anyone', CONNECTIONS: 'Connections only', LOGGED_IN: 'Logged-in members' }[text(values.visibility)] ?? 'Anyone'
  return (
    <Frame label="LinkedIn" tone="#4D9BF5">
      <div className="overflow-hidden rounded-lg border border-line-2 bg-[#1B1F23]">
        <div className="flex items-start gap-2.5 p-3">
          <Avatar name={account?.accountName ?? creator.name} seed={account?.avatarSeed ?? creator.avatarSeed} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-[#F3F2EF]">{account?.accountName ?? creator.name}</p>
            <p className="truncate text-[10.5px] text-[#A6A6A6]">{creator.role}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#A6A6A6]">
              <span className="rounded-sm border border-[#A6A6A6]/40 px-1">{visibilityLabel}</span>
            </p>
          </div>
          <MoreHorizontal className="h-3.5 w-3.5 text-[#A6A6A6]" />
        </div>
        <div className="px-3 pb-1">
          <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-[#F3F2EF]">
            {visible || <span className="text-[#A6A6A6]">Write your post…</span>}
            {body.length > 210 && <span className="text-[#A6A6A6]"> see more</span>}
          </p>
        </div>
        {values.media && (
          <div className="mt-1 aspect-[1.91/1] w-full bg-[#0B0D0F]">
            <img src={text(values.media)} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="mt-2 flex items-center justify-between border-t border-white/8 px-3 py-2 text-[10.5px] text-[#A6A6A6]">
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="h-3 w-3" /> Like
          </span>
          <span>Comment</span>
          <span>Repost</span>
          <span>Send</span>
        </div>
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-ink-faint">
        {body.length > 210
          ? 'The fold sits at about 210 characters — the first three lines decide whether anyone expands.'
          : `${body.length} / 3000 characters used.`}
      </p>
    </Frame>
  )
}

export const PREVIEWS: Record<ToolkitId, (p: PreviewProps) => React.ReactElement> = {
  youtube: YouTubePreview,
  instagram: InstagramPreview,
  linkedin: LinkedInPreview,
}
