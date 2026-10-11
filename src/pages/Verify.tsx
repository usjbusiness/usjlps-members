// Public check: members.usjlps.org/verify/LPS-2026-0001 — opens without signing in.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useVerifyCertificate } from '@/lib/api'
import { CERT_TITLE, ORG, rankName } from '@/lib/certificate'
import { fmtDate } from '@/lib/format'
import { Icon, Medal, Spinner } from '@/components/ui'
import { Foot, TopBar } from './Public'

export function VerifyPage() {
  const { no: raw = '' } = useParams()
  const no = raw.trim().toUpperCase()
  const q = useVerifyCertificate(no)
  const nav = useNavigate(); const [typed, setTyped] = useState(no)
  useEffect(() => { const prev = document.title; document.title = 'Verify an LPS Certificate · USJ LPS'; return () => { document.title = prev } }, [])
  const d = q.data

  return (
    <div className="pub"><TopBar />
      <div className="pub-body page vfy">
        <p className="eyebrow">Credential check</p>
        <h1>Verify an LPS Certificate</h1>
        <form className="vfy-form" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) nav(`/verify/${typed.trim().toUpperCase()}`) }}>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Credential ID, e.g. LPS-2026-0001" aria-label="Credential ID" />
          <button className="btn btn-gold">Check</button>
        </form>
        {!no ? <p className="muted">Type the Credential ID printed at the bottom of the certificate.</p>
          : q.isLoading ? <Spinner />
          : q.error ? <div className="vfy-card is-bad"><Icon name="close" size={22} /><div><h2>We could not check right now</h2><p className="muted">Please try again in a minute.</p></div></div>
          : !d ? <div className="vfy-card is-bad"><Icon name="close" size={22} /><div><h2>No certificate found</h2><p className="muted">There is no LPS certificate with the ID <b className="mono">{no}</b>. Check the spelling.</p></div></div>
          : d.valid ? (
            <div className="vfy-card is-ok">
              <Medal rank={d.rank_key ?? 'silver'} size={64} />
              <div>
                <span className="chip chip-ok"><Icon name="verified" size={13} />Valid certificate</span>
                <h2>{d.name}</h2>
                <p>{CERT_TITLE} · <b>{rankName(d.rank_key)} Rank</b></p>
                <p className="muted small">Issued by the {ORG}, University of Saint Joseph{d.issued_at ? ` on ${fmtDate(d.issued_at, { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}.</p>
                <dl className="vfy-dl">
                  <div><dt>Credential ID</dt><dd className="mono">{d.cert_no}</dd></div>
                  {d.president_name && <div><dt>President</dt><dd>{d.president_name}</dd></div>}
                  {d.advisor_name && <div><dt>{d.advisor_title || 'Advisor'}</dt><dd>{d.advisor_name}</dd></div>}
                </dl>
              </div>
            </div>
          ) : <div className="vfy-card is-bad"><Icon name="close" size={22} /><div><h2>This certificate was revoked</h2><p className="muted">Certificate <b className="mono">{d.cert_no}</b> issued to {d.name} is no longer valid.</p></div></div>}
        <p className="muted small vfy-about">Members earn this certificate by reaching Silver rank (6+ engagement stickers from LPS events), completing a professional résumé and keeping a professional profile.</p>
      </div>
      <Foot />
    </div>
  )
}
