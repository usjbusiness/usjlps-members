import { Link } from 'react-router-dom'
import { RANKS, rankOf, useMe } from '@/lib/api'
import { fmtDate } from '@/lib/format'
import { Icon, Medal, PageHead } from '@/components/ui'

export function RankPage() {
  const me = useMe().data!
  const r = rankOf(me.total)
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
        </div>
      </section>

      <section className="ladder">
        {RANKS.map((x, i) => {
          const done = me.total >= x.min; const cur = i === r.index
          return (
            <div key={x.key} className={`step${done ? ' is-done' : ''}${cur ? ' is-cur' : ''}`}>
              <Medal rank={x.key} size={46} locked={!done} />
              <div><strong>{x.name}{cur && <em className="you">You</em>}</strong><small>{x.min === 0 ? 'Approved application' : `${x.min} stickers`}</small><p>{x.perk}</p>
                {x.key === 'bronze' && done && <Link to="/apparel" className="more">Request your pin<Icon name="arrow" size={13} /></Link>}
                {x.key === 'silver' && done && <Link to="/apparel" className="more">Request your polo<Icon name="arrow" size={13} /></Link>}</div>
              {done ? <Icon name="check" size={18} className="step-ic" /> : <Icon name="lock" size={16} className="step-ic" />}
            </div>
          )
        })}
      </section>

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
