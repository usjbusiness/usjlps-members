// The public link: members.usjlps.org/u/:slug — opens without signing in.
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { defaultCover, usePublicPage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { isEmptyProfile } from '@/lib/profile'
import { publicUrl } from '@/lib/qr'
import { downloadPdf } from '@/lib/resume'
import { Icon, Spinner, useToast } from '@/components/ui'
import { AllSections, Hero, LinksBox, VerifiedBox, linkList, positionBadges } from '@/components/ProfileView'
import { fullResume } from './Person'
import { Paper } from './Resume'

function setMeta(name: string, content: string | null) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (content === null) { el?.remove(); return }
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el) }
  el.content = content
}

export function TopBar() {
  const { status } = useAuth()
  return (
    <header className="pub-top">
      <a href="https://usjlps.org" className="pub-brand"><img src="/img/mono-gold.webp" alt="" /><span><b>USJ LPS</b><small>Leadership &amp; Professional Society</small></span></a>
      <Link to={status === 'signed-in' ? '/' : '/login'} className="btn btn-ghost btn-sm">{status === 'signed-in' ? 'Member portal' : 'Member sign-in'}</Link>
    </header>
  )
}

export function Foot() {
  return (
    <footer className="pub-foot">
      <img src="/img/mono-gold.webp" alt="" />
      <p><b>USJ Leadership &amp; Professional Society</b> is a student organization at the University of Saint Joseph, West Hartford, CT.</p>
      <p className="muted small">Facts marked “Verified by USJ LPS” come from LPS records. Everything else was written by the member.</p>
      <a href="https://usjlps.org" className="link">usjlps.org</a>
    </footer>
  )
}

export function PublicPage() {
  const { slug = '' } = useParams()
  const q = usePublicPage(slug.toLowerCase())
  const toast = useToast(); const [busy, setBusy] = useState(false)
  const d = q.data

  useEffect(() => {
    const prev = document.title
    if (d) {
      document.title = `${d.full_name} · USJ LPS`
      setMeta('description', d.headline || `${d.full_name} is a member of the USJ Leadership & Professional Society.`)
      setMeta('robots', d.searchable ? null : 'noindex, nofollow')
    } else setMeta('robots', 'noindex, nofollow')
    return () => { document.title = prev; setMeta('robots', null) }
  }, [d])

  if (q.isLoading) return <div className="pub"><TopBar /><div className="pub-body"><Spinner /></div></div>
  if (!d) return (
    <div className="pub"><TopBar />
      <div className="pub-body pub-none">
        <img src="/img/mono-gold.webp" alt="" />
        <h1>This page is not available</h1>
        <p className="muted">{q.error ? 'We could not load it right now. Please try again in a minute.' : 'It may be private, the link may have changed, or it does not exist.'}</p>
        {q.error ? <button className="btn btn-gold" onClick={() => q.refetch()}>Try again</button> : <a className="btn btn-gold" href="https://usjlps.org">Visit usjlps.org</a>}
      </div>
      <Foot />
    </div>
  )

  const roles = positionBadges(d.positions)
  const advisorOnly = d.positions.length > 0 && d.positions.every((p) => p.kind === 'advisor')
  const showRank = !advisorOnly || d.total > 0
  const page = d.page ?? ({} as typeof d.page)
  const profile = page?.profile ?? {}
  const resume = d.resume ? fullResume(d.resume) : null
  const links = linkList({ linkedin: d.linkedin_url, email: d.email, instagram: page?.instagram, x_handle: page?.x_handle, tiktok: page?.tiktok, github: page?.github, website: page?.website })
  const first = d.full_name.split(' ')[0]

  return (
    <div className="pub"><TopBar />
      <div className="pub-body page pp">
        {d.is_me && <div className="pub-owner"><Icon name="eye" size={16} /><span>This is how others see your page{d.views != null ? ` · ${d.views} view${d.views === 1 ? '' : 's'}` : ''}</span><Link to="/people/me" className="link">Edit my page</Link></div>}
        <Hero name={d.full_name} avatar={d.avatar} ring={roles[0]?.color} roles={roles} total={d.total} showRank={showRank} headline={d.headline}
          meta={[d.major, d.grad_year ? `Class of ${d.grad_year}` : null].filter(Boolean).join(' · ')}
          cover={page?.cover ?? null} fallback={defaultCover(d.total, d.is_eboard)} profile={profile}
          actions={<>
            {d.linkedin_url && <a className="btn btn-ghost" href={d.linkedin_url} target="_blank" rel="noopener noreferrer"><Icon name="linkedin" size={16} />LinkedIn</a>}
            {d.email && <a className="btn btn-ghost" href={`mailto:${d.email}`}><Icon name="mail" size={16} />Email</a>}
            <button className="btn btn-ghost" onClick={async () => {
              const url = publicUrl(d.slug)
              try { if (navigator.share) await navigator.share({ title: d.full_name, url }); else { await navigator.clipboard.writeText(url); toast.ok('Link copied.') } } catch { /* closed */ }
            }}><Icon name="share" size={16} />Share</button>
          </>} />
        <div className="pp-grid">
          <aside className="pp-side">
            <VerifiedBox total={d.total} showRank={showRank} attendance={d.attendance} since={d.member_since} roles={roles} />
            <LinksBox links={links} />
          </aside>
          <main className="pp-main">
            {page?.bio && <section className="panel pp-about"><div className="panel-head"><h2>About</h2></div><p className="pp-bio">{page.bio}</p></section>}
            <AllSections profile={profile} />
            {resume && (
              <section className="panel pp-resume">
                <div className="panel-head">
                  <h2>Résumé</h2>
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => { setBusy(true); try { await downloadPdf(resume); toast.ok('PDF downloaded.') } catch (e) { toast.error(e) } finally { setBusy(false) } }}><Icon name="download" size={15} />{busy ? 'Preparing…' : 'Download PDF'}</button>
                </div>
                <Paper r={resume} />
              </section>
            )}
            {!page?.bio && !resume && isEmptyProfile(profile) && <p className="muted">{first} has not added more to this page yet.</p>}
          </main>
        </div>
      </div>
      <Foot />
    </div>
  )
}
