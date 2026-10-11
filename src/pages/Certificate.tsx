// The LPS Certificate: requirements, request, download, LinkedIn and the public verify link.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CERT_MIN, RESUME_MISSING, useCertificate, type CertChecks, type CertInfo } from '@/lib/api'
import { CERT_TITLE, LEVEL_MIN, ORG, distinction, downloadCertificatePdf, linkedInAddUrl, rankName, verifyUrl } from '@/lib/certificate'
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

function Preview({ name, level, no, issued }: { name: string; level: string; no?: string | null; issued?: string | null }) {
  const rank = rankName(level); const dist = distinction(level)
  return (
    <div className="cert-card" aria-label="Certificate preview">
      <div className="cert-in">
        <img src="/img/mono-gold.webp" alt="" className="cert-crest" />
        <p className="cert-org">{ORG}</p>
        <h3>{CERT_TITLE}</h3>
        {dist && <p className="cert-dist">{dist}</p>}
        <p className="cert-small">This certifies that</p>
        <p className="cert-name">{name || 'Your Name'}</p>
        <p className="cert-body">has earned the <b>{rank}</b> rank through active participation in the LPS professional development program, and has completed a professional résumé and profile.</p>
        <div className="cert-sigs"><span>President</span><i className={`cert-seal r-${level}`}>{rank}</i><span>Advisor</span></div>
        <p className="cert-id">{no ? `Credential ID ${no}${issued ? ` · Issued ${fmtDate(issued, { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}` : 'Credential ID is added when the e-board issues it'}</p>
      </div>
    </div>
  )
}

const LEVELS = [
  { key: 'silver', label: 'Silver', sub: 'Certificate of Achievement' },
  { key: 'gold', label: 'Gold', sub: 'with Distinction' },
  { key: 'ivy', label: 'Ivy', sub: 'with Highest Distinction' },
] as const

function Levels({ total, certs }: { total: number; certs: CertInfo[] }) {
  return (
    <div className="cert-levels">
      {LEVELS.map((l) => {
        const c = certs.find((x) => x.level === l.key); const min = LEVEL_MIN[l.key]
        const state = c?.status === 'issued' ? 'Issued' : c?.status === 'requested' ? 'Requested' : total >= min ? 'Unlocked' : `${Math.max(0, min - total)} more sticker${min - total === 1 ? '' : 's'}`
        return (
          <div key={l.key} className={`cert-lv r-${l.key}${c?.status === 'issued' ? ' is-ok' : total >= min ? ' is-open' : ''}`}>
            <i className={`cert-seal r-${l.key}`}>{l.label}</i>
            <div><strong>{l.label} · {min} stickers</strong><small>{l.sub}</small></div>
            <span className={`chip${c?.status === 'issued' ? ' chip-ok' : total >= min ? ' chip-gold' : ''}`}>{state}</span>
          </div>
        )
      })}
    </div>
  )
}

export function CertificatePage() {
  const q = useCertificate(); const qc = useQueryClient(); const toast = useToast()
  const [name, setName] = useState(''); const [busy, setBusy] = useState(''); const [pick, setPick] = useState<string | null>(null)
  const d = q.data
  useEffect(() => { if (d && !name) setName(d.cert?.name ?? d.full_name) }, [d]) // eslint-disable-line react-hooks/exhaustive-deps

  if (q.isLoading) return <div className="page"><Spinner /></div>
  if (q.error) return <div className="page"><ErrorBox error={q.error} retry={() => q.refetch()} /></div>
  if (!d) return <div className="page"><Empty icon="cert" title="Certificates are for General Body members" body="Officers can get one when they are also on the member roster." /></div>

  const ch = d.checks; const certs = d.certs ?? (d.cert ? [d.cert] : [])
  const issued = certs.filter((c) => c.status === 'issued')
  const level = ch.level ?? 'silver'
  const cur = certs.find((c) => c.level === level) ?? null      // request for my current level
  const shown = issued.find((c) => c.level === pick) ?? issued[0] ?? null   // best issued (or the one picked)
  const canRequest = ch.ok && cur?.status !== 'issued' && cur?.status !== 'requested'
  const upgrade = issued.length > 0 && !!ch.level && cur?.status !== 'issued'

  const request = async () => {
    if (name.trim().length < 3) { toast.error('Type your full name as it should appear.'); return }
    setBusy('req')
    const { error } = await supabase.rpc('request_certificate', { p_name: name.trim() })
    setBusy('')
    if (error) { toast.error(error); return }
    toast.ok('Request sent. The e-board will review it and issue your certificate.')
    qc.invalidateQueries({ queryKey: ['certificate'] })
  }
  const download = async (c: CertInfo) => {
    setBusy(`dl${c.level}`)
    try { await downloadCertificatePdf(c, d.member_since); toast.ok('Certificate downloaded.') } catch (e) { toast.error(e) } finally { setBusy('') }
  }
  const copy = async (no: string) => { try { await navigator.clipboard.writeText(verifyUrl(no)); toast.ok('Verify link copied.') } catch { toast.error('Could not copy.') } }

  const requestBox = (
    <>
      {cur?.status === 'declined' && <p className="cert-note"><Icon name="close" size={14} />Your last request was not approved{cur.note ? `: ${cur.note}` : '.'} You can fix it and request again.</p>}
      <label className="fld"><span>Name on certificate</span><input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" /></label>
      <button className="btn btn-gold btn-block" disabled={!canRequest || !!busy} onClick={request}><Icon name="cert" size={16} />
        {canRequest ? (busy === 'req' ? 'Sending…' : `Request my ${rankName(level)} certificate`) : ch.ok ? 'Already requested' : 'Finish the 3 steps to request'}</button>
    </>
  )

  return (
    <div className="page">
      <PageHead eyebrow="Earn it. Show it." title="LPS Certificate" sub="An official Certificate of Achievement from the USJ Leadership & Professional Society — signed by the President and our Advisor, with a Credential ID employers can verify. Silver, then Gold “with Distinction” and Ivy “with Highest Distinction”." />
      <div className="cert-grid">
        <div>
          <Preview name={shown?.name ?? name} level={shown?.level ?? level} no={shown?.cert_no} issued={shown?.issued_at} />
          <Levels total={ch.total} certs={certs} />
        </div>
        <div className="cert-side">
          {shown && (
            <section className="panel cert-done">
              <span className="chip chip-ok"><Icon name="verified" size={13} />{rankName(shown.level)} certificate issued</span>
              <h2>Congratulations, {shown.name.split(' ')[0]}!</h2>
              <p className="muted small">Credential ID <b className="mono">{shown.cert_no}</b>{shown.issued_at && <> · {fmtDate(shown.issued_at, { month: 'long', day: 'numeric', year: 'numeric' })}</>}</p>
              {issued.length > 1 && <div className="chips-pick cert-pick">{issued.map((c) => <button key={c.level} className={`chip${c.level === shown.level ? ' chip-gold' : ''}`} onClick={() => setPick(c.level)}>{rankName(c.level)}</button>)}</div>}
              <div className="cert-actions">
                <button className="btn btn-gold" disabled={!!busy} onClick={() => download(shown)}><Icon name="download" size={16} />{busy === `dl${shown.level}` ? 'Preparing…' : 'Download PDF'}</button>
                <a className="btn btn-ghost" href={linkedInAddUrl(shown)} target="_blank" rel="noopener noreferrer"><Icon name="linkedin" size={16} />Add to LinkedIn</a>
                <button className="btn btn-ghost" onClick={() => copy(shown.cert_no ?? '')}><Icon name="copy" size={16} />Copy verify link</button>
                <Link className="btn btn-ghost" to={`/verify/${shown.cert_no}`}><Icon name="eye" size={16} />Verify page</Link>
              </div>
              <p className="muted small">On LinkedIn it goes to <b>Licenses &amp; certifications</b> with the Credential ID and verify link already filled in.</p>
            </section>
          )}
          {cur?.status === 'requested' ? (
            <section className="panel">
              <span className="chip chip-st-requested"><Icon name="clock" size={13} />Requested {fmtDate(cur.requested_at, { month: 'short', day: 'numeric' })}</span>
              <h2 className="cert-h">{rankName(cur.level)} certificate — waiting for the e-board</h2>
              <p className="muted small">They will check your record and issue it. You will be able to download it right here.{issued.length ? ' Your earlier certificate stays valid.' : ''}</p>
              <p className="small">Name on certificate: <b>{cur.name}</b></p>
            </section>
          ) : upgrade ? (
            <section className="panel cert-up">
              <span className="chip chip-gold"><Icon name="sparkle" size={13} />Upgrade unlocked</span>
              <h2 className="cert-h">Your {rankName(level)} certificate is ready to request</h2>
              <p className="muted small">You reached {rankName(level)}: the new certificate says <b>{distinction(level)}</b> and gets its own Credential ID. Your {rankName(issued[0].level)} certificate stays valid.</p>
              {!ch.ok && <CertSteps c={ch} compact />}
              {requestBox}
            </section>
          ) : shown ? (
            ch.next_level && ch.next_need ? (
              <section className="panel">
                <h2 className="cert-h">Next: {rankName(ch.next_level)} {distinction(ch.next_level)}</h2>
                <p className="muted small">{ch.total} of {ch.next_need} stickers · {ch.next_need - ch.total} more. When you get there, request the new certificate here.</p>
                <div className="bar"><i style={{ width: `${Math.min(100, Math.round((ch.total / ch.next_need) * 100))}%` }} /></div>
              </section>
            ) : null
          ) : (
            <section className="panel">
              <div className="panel-head"><h2>How to get it</h2><span className="muted small">{[ch.rank_ok, ch.resume_ok, ch.page_ok].filter(Boolean).length} of 3 done</span></div>
              <CertSteps c={ch} />
              {requestBox}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
