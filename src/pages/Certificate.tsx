// The LPS Certificate: requirements, request, download, LinkedIn and the public verify link.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CERT_MIN, RESUME_MISSING, rankOf, useCertificate, type CertChecks } from '@/lib/api'
import { CERT_TITLE, ORG, downloadCertificatePdf, linkedInAddUrl, rankName, verifyUrl } from '@/lib/certificate'
import { fmtDate } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { Empty, ErrorBox, Icon, PageHead, Spinner, useToast } from '@/components/ui'

/** The three things a member needs. Used on this page and on Rank & Stickers. */
export function CertSteps({ c, compact }: { c: CertChecks; compact?: boolean }) {
  const need = c.need || CERT_MIN
  const steps = [
    { ok: c.rank_ok, title: 'Reach Silver rank', body: c.rank_ok ? `Done · ${c.total} stickers` : `${c.total} of ${need} stickers · ${need - c.total} more to go`, to: '/rank', cta: 'See my stickers' },
    {
      ok: c.resume_ok, title: 'Finish your résumé', to: '/resume', cta: 'Open Résumé Builder',
      body: c.resume_ok ? 'Done · your résumé is complete' : <>Still missing:<ul>{c.resume_missing.map((m) => <li key={m}>{RESUME_MISSING[m] ?? m}</li>)}</ul></>,
    },
    {
      ok: c.page_ok, title: 'Have a professional page', to: c.page_ok ? (c.page_kind === 'public' ? `/u/${c.slug}` : '/profile') : '/people/me', cta: c.page_ok ? 'View' : 'Make my page public',
      body: c.page_ok ? (c.page_kind === 'public' ? 'Done · your public LPS page is live' : 'Done · LinkedIn profile added') : <>Turn on your public LPS page in <b>My Page</b>, <i>or</i> add your LinkedIn link in <Link to="/profile" className="link">My Profile</Link>.</>,
    },
  ]
  return (
    <ol className={`csteps${compact ? ' is-compact' : ''}`}>
      {steps.map((s, i) => (
        <li key={i} className={s.ok ? 'is-ok' : ''}>
          <span className="cstep-n">{s.ok ? <Icon name="check" size={16} /> : i + 1}</span>
          <div><strong>{s.title}</strong><div className="muted small">{s.body}</div></div>
          {!s.ok || !compact ? <Link to={s.to} className="more">{s.cta}<Icon name="arrow" size={13} /></Link> : null}
        </li>
      ))}
    </ol>
  )
}

function Preview({ name, rank, no, issued }: { name: string; rank: string; no?: string | null; issued?: string | null }) {
  return (
    <div className="cert-card" aria-label="Certificate preview">
      <div className="cert-in">
        <img src="/img/mono-gold.webp" alt="" className="cert-crest" />
        <p className="cert-org">{ORG}</p>
        <h3>{CERT_TITLE}</h3>
        <p className="cert-small">This certifies that</p>
        <p className="cert-name">{name || 'Your Name'}</p>
        <p className="cert-body">has earned the <b>{rank}</b> rank through active participation in the LPS professional development program, and has completed a professional résumé and profile.</p>
        <div className="cert-sigs"><span>President</span><i className={`cert-seal r-${rank.toLowerCase()}`}>{rank}</i><span>Advisor</span></div>
        <p className="cert-id">{no ? `Credential ID ${no}${issued ? ` · Issued ${fmtDate(issued, { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}` : 'Credential ID is added when the e-board issues it'}</p>
      </div>
    </div>
  )
}

export function CertificatePage() {
  const q = useCertificate(); const qc = useQueryClient(); const toast = useToast()
  const [name, setName] = useState(''); const [busy, setBusy] = useState(false)
  const d = q.data
  useEffect(() => { if (d && !name) setName(d.cert?.name ?? d.full_name) }, [d]) // eslint-disable-line react-hooks/exhaustive-deps

  if (q.isLoading) return <div className="page"><Spinner /></div>
  if (q.error) return <div className="page"><ErrorBox error={q.error} retry={() => q.refetch()} /></div>
  if (!d) return <div className="page"><Empty icon="cert" title="Certificates are for General Body members" body="Officers can get one when they are also on the member roster." /></div>

  const c = d.cert; const ch = d.checks
  const rank = rankName(c?.rank_key ?? (ch.rank_ok ? rankOf(ch.total).rank.key : 'silver'))
  const request = async () => {
    if (name.trim().length < 3) { toast.error('Type your full name as it should appear.'); return }
    setBusy(true)
    const { error } = await supabase.rpc('request_certificate', { p_name: name.trim() })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.ok('Request sent. The e-board will review it and issue your certificate.')
    qc.invalidateQueries({ queryKey: ['certificate'] })
  }
  const download = async () => {
    if (!c) return
    setBusy(true)
    try { await downloadCertificatePdf(c, d.member_since); toast.ok('Certificate downloaded.') } catch (e) { toast.error(e) } finally { setBusy(false) }
  }
  const copy = async () => { try { await navigator.clipboard.writeText(verifyUrl(c?.cert_no ?? '')); toast.ok('Verify link copied.') } catch { toast.error('Could not copy.') } }

  return (
    <div className="page">
      <PageHead eyebrow="Earn it. Show it." title="LPS Certificate" sub="An official Certificate of Achievement from the USJ Leadership & Professional Society — signed by the President and our Advisor, with a Credential ID employers can verify." />
      <div className="cert-grid">
        <Preview name={c?.status === 'issued' ? c.name : name} rank={rank} no={c?.status === 'issued' ? c.cert_no : null} issued={c?.issued_at} />
        <div className="cert-side">
          {c?.status === 'issued' ? (
            <section className="panel cert-done">
              <span className="chip chip-ok"><Icon name="verified" size={13} />Issued</span>
              <h2>Congratulations, {c.name.split(' ')[0]}!</h2>
              <p className="muted small">Credential ID <b className="mono">{c.cert_no}</b>{c.issued_at && <> · {fmtDate(c.issued_at, { month: 'long', day: 'numeric', year: 'numeric' })}</>}</p>
              <div className="cert-actions">
                <button className="btn btn-gold" disabled={busy} onClick={download}><Icon name="download" size={16} />{busy ? 'Preparing…' : 'Download PDF'}</button>
                <a className="btn btn-ghost" href={linkedInAddUrl(c)} target="_blank" rel="noopener noreferrer"><Icon name="linkedin" size={16} />Add to LinkedIn</a>
                <button className="btn btn-ghost" onClick={copy}><Icon name="copy" size={16} />Copy verify link</button>
                <Link className="btn btn-ghost" to={`/verify/${c.cert_no}`}><Icon name="eye" size={16} />Verify page</Link>
              </div>
              <p className="muted small">On LinkedIn it goes to <b>Licenses &amp; certifications</b> with the Credential ID and verify link already filled in.</p>
            </section>
          ) : c?.status === 'requested' ? (
            <section className="panel">
              <span className="chip chip-st-requested"><Icon name="clock" size={13} />Requested {fmtDate(c.requested_at, { month: 'short', day: 'numeric' })}</span>
              <h2 className="cert-h">Waiting for the e-board</h2>
              <p className="muted small">They will check your record and issue it. You will be able to download it right here.</p>
              <p className="small">Name on certificate: <b>{c.name}</b></p>
            </section>
          ) : (
            <section className="panel">
              <div className="panel-head"><h2>How to get it</h2><span className="muted small">{[ch.rank_ok, ch.resume_ok, ch.page_ok].filter(Boolean).length} of 3 done</span></div>
              {c?.status === 'declined' && <p className="cert-note"><Icon name="close" size={14} />Your last request was not approved{c.note ? `: ${c.note}` : '.'} You can fix it and request again.</p>}
              <CertSteps c={ch} />
              <label className="fld"><span>Name on certificate</span><input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" /></label>
              <button className="btn btn-gold btn-block" disabled={!ch.ok || busy} onClick={request}><Icon name="cert" size={16} />{ch.ok ? (busy ? 'Sending…' : 'Request my certificate') : 'Finish the 3 steps to request'}</button>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
