import { Link } from 'react-router-dom'
import { RANKS, rankOf, useCertificate, useMe } from '@/lib/api'
import { CertSteps } from './Certificate'
import { fmtDate } from '@/lib/format'
import { Icon, Medal, PageHead } from '@/components/ui'

export function RankPage() {
  const me = useMe().data!
  const r = rankOf(me.total)
  const cert = useCertificate().data
  const target = r.next?.min ?? me.total
  const placeholders = Math.max(0, target - me.stickers.reduce((s, x) => s + x.value, 0))
  return (
    <div className="page">
      <PageHead eyebrow="Show up. Level up." title="Rank & Stickers" sub="Every event earns a sticker. Headliner events count double. Stickers unlock ranks, and every rank unlocks something real." />
      <section className="rank-hero">
        <Medal rank={r.rank.key} size={120} />
        <div>
          <p className="eyebrow">Current rank</p>
          <h2>{r.rank.name}</h2>
          <p className="rank-count"><b>{me.total}</b> sticker{me.total === 1 ? '' : 's'}{r.next && <> · <b>{r.toNext}</b> more to {r.next.name}</>}</p>
          <div className="bar bar-lg"><i style={{ width: `${r.pct}%` }} /></div>
          <p className="muted small">{r.rank.perk}</p>
          <Link to="/record" className="more" style={{ marginTop: 10 }}><Icon name="record" size={14} />My full record (PDF)<Icon name="arrow" size={13} /></Link>
        </div>
      </section>

      <section className="ladder">
        {RANKS.map((x, i) => {
          const done = me.total >= x.min; const cur = i === r.index
          return (
            <div key={x.key} className={`step${done ? ' is-done' : ''}${cur ? ' is-cur' : ''}`}>
              <Medal rank={x.key} size={46} locked={!done} />
              <div><strong>{x.name}{cur && <em className="you">You</em>}</strong><small>{x.min === 0 ? 'Approved application' : `${x.min} stickers`}</small><p>{x.perk}</p>
                {x.key === 'bronze' && done && <Link to="/people/me" className="more">Personalize your Bronze page<Icon name="arrow" size={13} /></Link>}
                {x.key === 'silver' && done && <span className="step-links"><Link to="/apparel" className="more">Request your polo<Icon name="arrow" size={13} /></Link><Link to="/certificate" className="more">Get your certificate<Icon name="arrow" size={13} /></Link></span>}</div>
              {done ? <Icon name="check" size={18} className="step-ic" /> : <Icon name="lock" size={16} className="step-ic" />}
            </div>
          )
        })}
      </section>

      {cert && (
        <section className="panel rank-cert">
          <div className="panel-head">
            <h2><Icon name="cert" size={20} />LPS Certificate</h2>
            {cert.cert?.status === 'requested' ? <span className="chip chip-st-requested">Requested</span>
              : cert.cert?.status === 'issued' ? <span className="chip chip-ok">{cert.cert.level ? `${cert.cert.level[0].toUpperCase()}${cert.cert.level.slice(1)} · ` : ''}{cert.cert.cert_no}</span>
              : <span className="muted small">{[cert.checks.rank_ok, cert.checks.resume_ok, cert.checks.page_ok].filter(Boolean).length} of 3 done</span>}
          </div>
          <p className="muted small">An official certificate signed by the President and our Advisor, with a Credential ID you can add to LinkedIn. Silver at 6 stickers, Gold “with Distinction” at 10, Ivy “with Highest Distinction” at 15. To get it:</p>
          <CertSteps c={cert.checks} compact />
          <Link to="/certificate" className="btn btn-gold btn-sm">{cert.checks.ok && cert.cert?.level !== cert.checks.level ? `Request my ${cert.checks.level === 'ivy' ? 'Ivy' : cert.checks.level === 'gold' ? 'Gold' : 'Silver'} certificate` : cert.cert?.status === 'issued' ? 'Download my certificate' : cert.checks.ok && !cert.cert ? 'Request my certificate' : 'Open certificate page'}<Icon name="arrow" size={14} /></Link>
        </section>
      )}

      <section className="panel">
        <div className="panel-head"><h2>My stickers</h2><span className="muted small">{me.stickers.length} event{me.stickers.length === 1 ? '' : 's'}</span></div>
        <div className="stickers">
          {me.stickers.map((s, i) => (
            <div key={i} className={`sticker${s.headliner ? ' is-double' : ''}`}>
              <span className="sticker-disc"><img src="/img/mono-gold.webp" alt="" />{s.headliner && <b>×2</b>}</span>
              <strong>{s.title}</strong><small>{fmtDate(s.earned_on, { month: 'short', day: 'numeric' })}</small>
            </div>
          ))}
          {Array.from({ length: Math.min(placeholders, 15) }, (_, i) => <div key={`p${i}`} className="sticker is-empty"><span className="sticker-disc" /><small>Next event</small></div>)}
        </div>
        {!me.member && <p className="muted small pad">Stickers are counted for General Body members. Officers earn them when they are also on the roster.</p>}
        <p className="muted small pad">Attendance is recorded by the e-board at each meeting. Missing a sticker? Tell the Secretary.</p>
      </section>
    </div>
  )
}
