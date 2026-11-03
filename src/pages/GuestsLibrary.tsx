import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GuestCard } from '@/components/FeaturedGuest'
import { Empty, ErrorBox, Icon, PageHead, Spinner } from '@/components/ui'
import { fmtDate } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { useMe, type EventGuest } from '@/lib/api'
import './GuestsLibrary.css'

type PastGuest = EventGuest & { event_title: string; starts_at: string }
type LibraryItem = { id: string; guest_name: string; title: string; media_type: 'presentation' | 'video'; storage_path: string | null; youtube_id: string | null }
const bucket = 'lps-private-guest-library'

/** Only accept genuine YouTube hosts and a single valid 11-character ID. */
function youtubeId(input: string): string | null {
  try {
    const u = new URL(input.trim())
    if (u.protocol !== 'https:') return null
    const host = u.hostname.toLowerCase()
    let id: string | null = null
    if (host === 'youtu.be') id = u.pathname.split('/')[1] ?? null
    else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'www.youtube-nocookie.com'].includes(host)) {
      const parts = u.pathname.split('/')
      id = u.pathname === '/watch' ? u.searchParams.get('v') : ['embed', 'live', 'shorts'].includes(parts[1]) ? parts[2] : null
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  } catch { return null }
}

function Material({ item, canManage, onChanged }: { item: LibraryItem; canManage: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [video, setVideo] = useState('')
  async function open() {
    setBusy(true); setError(''); setVideo('')
    try {
      if (item.youtube_id) { setVideo(`https://www.youtube-nocookie.com/embed/${item.youtube_id}`); return }
      if (!item.storage_path) throw new Error('File unavailable')
      if (item.media_type === 'video') {
        const result = await supabase.storage.from(bucket).createSignedUrl(item.storage_path, 7200)
        if (result.error || !result.data?.signedUrl) throw result.error || new Error('Recording unavailable')
        setVideo(result.data.signedUrl)
      } else {
        const result = await supabase.storage.from(bucket).download(item.storage_path)
        if (result.error || !result.data) throw result.error || new Error('Presentation unavailable')
        const url = URL.createObjectURL(result.data)
        const a = document.createElement('a'); a.href = url; a.download = item.storage_path.split('/').pop() || 'presentation.pptx'; a.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      }
    } catch { setError('This file is not available right now. Please contact the E-Board.') }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm('Remove this recording from the LPS library? This will not delete the video from YouTube.')) return
    setBusy(true); setError('')
    try {
      const { data, error: failure } = await supabase.from('guest_library_items').delete().eq('id', item.id).select('id')
      if (failure || !data?.length) throw failure || new Error('Not allowed')
      onChanged()
    } catch { setError('Could not remove this recording. Please check your access and try again.') }
    finally { setBusy(false) }
  }
  return <article className="guest-library-item">
    <div className="guest-library-item-icon"><Icon name={item.media_type === 'video' ? 'live' : 'board'} size={20}/></div>
    <div className="guest-library-item-text"><span>{item.media_type === 'video' ? 'Recording' : 'Presentation'} · {item.guest_name}</span><strong>{item.title}</strong></div>
    <button className="btn btn-ghost" onClick={() => void open()} disabled={busy}>{busy ? 'Opening…' : item.media_type === 'video' ? 'Watch' : 'Download'} <Icon name={item.media_type === 'video' ? 'arrow' : 'download'} size={16}/></button>
    {canManage && item.youtube_id && <button className="btn btn-ghost" onClick={() => void remove()} disabled={busy}>Remove</button>}
    {video && item.youtube_id && <><iframe className="guest-library-video" src={video} title={`YouTube recording: ${item.title}`} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /><a className="guest-library-youtube-link" href={`https://www.youtube.com/watch?v=${item.youtube_id}`} target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a></>}
    {video && !item.youtube_id && <video className="guest-library-video" controls playsInline src={video} onError={() => { setVideo(''); setError('This recording could not be played. Please contact the E-Board.') }} />}
    {error && <p className="guest-library-error" role="alert">{error}</p>}
  </article>
}

function AddRecording({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState(''); const [title, setTitle] = useState(''); const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [ok, setOk] = useState(false)
  async function save(e: FormEvent) {
    e.preventDefault(); setError(''); setOk(false)
    const id = youtubeId(url)
    if (!id) { setError('Enter a valid HTTPS YouTube video link.'); return }
    if (!name.trim() || !title.trim()) { setError('Enter the guest name and recording title.'); return }
    setBusy(true)
    try {
      const { error: failure } = await supabase.from('guest_library_items').insert({ guest_name: name.trim(), title: title.trim(), media_type: 'video', storage_path: null, youtube_id: id, published: true })
      if (failure) throw failure
      setName(''); setTitle(''); setUrl(''); setOk(true); onSaved()
    } catch { setError('Could not add this recording. Check your access and try again.') }
    finally { setBusy(false) }
  }
  return <details className="guest-library-admin"><summary>Add a YouTube recording</summary><form onSubmit={save}>
    <p>Upload the recording to YouTube as <strong>Unlisted</strong> and allow embedding. Anyone with its link can share it. Only add recordings you have permission to share.</p>
    <div className="guest-library-form"><label>Guest name<input required maxLength={160} value={name} onChange={e => setName(e.target.value)} placeholder="Marc Crawford" /></label><label>Recording title<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="Building a Business in Healthcare" /></label><label className="guest-library-url">YouTube link<input required type="url" maxLength={500} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://youtu.be/…" /></label></div>
    {error && <p className="guest-library-error" role="alert">{error}</p>}{ok && <p role="status">Recording added to the library.</p>}
    <button className="btn btn-gold" disabled={busy}>{busy ? 'Adding…' : 'Add recording'}</button>
  </form></details>
}

export function GuestsLibrary() {
  const qc = useQueryClient(); const canManage = !!useMe().data?.board?.can_manage
  const guests = useQuery({ queryKey: ['guest-archive'], queryFn: async () => {
    const { data, error } = await supabase.rpc('member_guest_archive')
    if (error) throw error
    return ((data ?? []) as PastGuest[]).sort((a, b) => b.starts_at.localeCompare(a.starts_at))
  } })
  const materials = useQuery({ queryKey: ['guest-library-items'], queryFn: async () => {
    const { data, error } = await supabase.from('guest_library_items').select('id,guest_name,title,media_type,storage_path,youtube_id').eq('published', true).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as LibraryItem[]
  } })
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['guest-library-items'] }) }
  return <div className="page guest-library">
    <PageHead eyebrow="The LPS archive" title="Guests & Recordings" sub="Ideas worth returning to. Meet the people who have shared their experience with our Society." />
    <section className="guest-library-intro"><div><span className="guest-library-kicker"><Icon name="lock" size={14}/> Member portal</span><h2>Learn from leaders.<br/>Come back to the conversation.</h2><p>Explore talks and presentation materials shared with LPS. Unlisted YouTube links may be shared outside the portal.</p></div><div className="guest-library-intro-mark" aria-hidden="true">LPS<span>GUEST ARCHIVE</span></div></section>
    <section className="guest-library-section"><div className="guest-library-heading"><div><span className="eyebrow">01 / Watch & explore</span><h2>Presentations & recordings</h2></div><p>Recordings appear when they are available.</p></div>
      {canManage && <AddRecording onSaved={refresh}/>}
      {materials.isLoading ? <Spinner /> : materials.error ? <ErrorBox error={materials.error} retry={() => void materials.refetch()} /> : materials.data?.length ? <div className="guest-library-materials">{materials.data.map(item => <Material key={item.id} item={item} canManage={canManage} onChanged={refresh}/>)}</div> : <Empty icon="live" title="The library is taking shape" body="Presentations and recordings will appear here when they are ready."/>}
    </section>
    <section className="guest-library-section"><div className="guest-library-heading"><div><span className="eyebrow">02 / Our guests</span><h2>People we have learned from</h2></div><p>Guest profiles from completed LPS events.</p></div>
      {guests.isLoading ? <Spinner /> : guests.error ? <ErrorBox error={guests.error} retry={() => void guests.refetch()} /> : guests.data?.length ? <div className="guest-library-grid">{guests.data.map(g => <article className="guest-library-card" key={`${g.kind}:${g.id}`}><div className="guest-library-event"><span>{fmtDate(g.starts_at, {month:'short', day:'numeric', year:'numeric'})}</span><h3>{g.event_title}</h3></div><GuestCard guest={g}/></article>)}</div> : <Empty icon="people" title="More stories to come" body="Published guest profiles from completed events will appear here."/>}
    </section>
  </div>
}
