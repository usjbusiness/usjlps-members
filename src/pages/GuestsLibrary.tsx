import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GuestCard } from '@/components/FeaturedGuest'
import { Empty, ErrorBox, Icon, PageHead, Spinner } from '@/components/ui'
import { fmtDate } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import type { EventGuest } from '@/lib/api'
import './GuestsLibrary.css'

type PastGuest = EventGuest & { event_title: string; starts_at: string }
type LibraryItem = { id: string; guest_name: string; title: string; media_type: 'presentation' | 'video'; storage_path: string }
const bucket = 'lps-private-guest-library'

function Material({ item }: { item: LibraryItem }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [video, setVideo] = useState('')
  async function open() {
    setBusy(true); setError(''); setVideo('')
    try {
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
  return <article className="guest-library-item">
    <div className="guest-library-item-icon"><Icon name={item.media_type === 'video' ? 'live' : 'board'} size={20}/></div>
    <div className="guest-library-item-text"><span>{item.media_type === 'video' ? 'Recording' : 'Presentation'} · {item.guest_name}</span><strong>{item.title}</strong></div>
    <button className="btn btn-ghost" onClick={() => void open()} disabled={busy}>{busy ? 'Opening…' : item.media_type === 'video' ? 'Watch' : 'Download'} <Icon name={item.media_type === 'video' ? 'arrow' : 'download'} size={16}/></button>
    {video && <video className="guest-library-video" controls playsInline src={video} onError={() => { setVideo(''); setError('This recording could not be played. Please contact the E-Board.') }} />}
    {error && <p className="guest-library-error" role="alert">{error}</p>}
  </article>
}

export function GuestsLibrary() {
  const guests = useQuery({ queryKey: ['guest-archive'], queryFn: async () => {
    const { data, error } = await supabase.rpc('member_guest_archive')
    if (error) throw error
    return ((data ?? []) as PastGuest[]).sort((a, b) => b.starts_at.localeCompare(a.starts_at))
  } })
  const materials = useQuery({ queryKey: ['guest-library-items'], queryFn: async () => {
    const { data, error } = await supabase.from('guest_library_items').select('id,guest_name,title,media_type,storage_path').eq('published', true).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as LibraryItem[]
  } })
  return <div className="page guest-library">
    <PageHead eyebrow="The LPS archive" title="Guests & Recordings" sub="Ideas worth returning to. Meet the people who have shared their experience with our Society." />
    <section className="guest-library-intro"><div><span className="guest-library-kicker"><Icon name="lock" size={14}/> Members only</span><h2>Learn from leaders.<br/>Come back to the conversation.</h2><p>Explore talks and presentation materials shared with LPS. Recordings appear here when they become available.</p></div><div className="guest-library-intro-mark" aria-hidden="true">LPS<span>GUEST ARCHIVE</span></div></section>
    <section className="guest-library-section"><div className="guest-library-heading"><div><span className="eyebrow">01 / Watch & explore</span><h2>Presentations & recordings</h2></div><p>Available to active members and the E-Board.</p></div>
      {materials.isLoading ? <Spinner /> : materials.error ? <ErrorBox error={materials.error} retry={() => void materials.refetch()} /> : materials.data?.length ? <div className="guest-library-materials">{materials.data.map(item => <Material key={item.id} item={item}/>)}</div> : <Empty icon="live" title="The library is taking shape" body="Presentations and recordings will appear here when they are ready."/>}
    </section>
    <section className="guest-library-section"><div className="guest-library-heading"><div><span className="eyebrow">02 / Our guests</span><h2>People we have learned from</h2></div><p>Guest profiles from completed LPS events.</p></div>
      {guests.isLoading ? <Spinner /> : guests.error ? <ErrorBox error={guests.error} retry={() => void guests.refetch()} /> : guests.data?.length ? <div className="guest-library-grid">{guests.data.map(g => <article className="guest-library-card" key={`${g.kind}:${g.id}`}><div className="guest-library-event"><span>{fmtDate(g.starts_at, {month:'short', day:'numeric', year:'numeric'})}</span><h3>{g.event_title}</h3></div><GuestCard guest={g}/></article>)}</div> : <Empty icon="people" title="More stories to come" body="Published guest profiles from completed events will appear here."/>}
    </section>
  </div>
}
