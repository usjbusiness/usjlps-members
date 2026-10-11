import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useHistory, useMe } from '@/lib/api'
import { buildRecord, downloadRecordPdf } from '@/lib/record'
import { fmtDate } from '@/lib/format'
import { Empty, ErrorBox, Icon, Medal, PageHead, Spinner, useToast } from '@/components/ui'

const KIND = { meeting: 'General Meeting', headliner: 'Headliner ×2', award: 'Sticker award' }

export function RecordPage() {
  const me = useMe().data!
  const q = useHistory()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const no = (me.member?.id ?? me.board?.id ?? '').replace(/-/g, '').slice(0, 6).toUpperCase()
  const pdf = async () => {
    if (!q.data) return
    setBusy(true)
    try { await downloadRecordPdf(q.data, no); toast.ok('Your record was downloaded as a PDF.') } catch (e) { toast.error(e) } finally { setBusy(false) }
  }
  if (q.isLoading) return <div className="page"><Spinner /></div>
  if (q.error) return <div className="page"><ErrorBox error={q.error} retry={() => q.refetch()} /></div>
  const h = q.data!
  if (!h.member) return <div className="page"><PageHead eyebrow="History" title="My Record" /><Empty icon="record" title="No member record" body="This page shows a member's attendance and stickers. Your e-board account is not on the member roster." /></div>
  const rec = buildRecord(h)
  const rows = [...rec.rows].reverse()
  return (
    <div className="page">
      <PageHead eyebrow="History" title="My Record" sub="Every General Meeting since you joined, every sticker and every merch request, with your rank at that moment. Download it as a PDF any time."
        actions={<button className="btn btn-gold btn-sm" disabled={busy} onClick={pdf}><Icon name="download" size={16} />{busy ? 'Preparing…' : 'Download PDF'}</button>} />
      <section className="rec-sum">
        <div><Medal rank={rec.rank.toLowerCase()} size={44} /><span><small>Current rank</small><b>{rec.rank}</b></span></div>
        <div><span><small>Total stickers</small><b>{rec.total}</b></span></div>
        <div><span><small>Meetings attended</small><b>{rec.present} <em>of {rec.meetings}</em></b></span></div>
        <div><span><small>Member since</small><b>{fmtDate(h.member.date_joined, { month: 'short', year: 'numeric' })}</b></span></div>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Attendance and stickers</h2><Link to="/rank" className="more">Ranks<Icon name="arrow" size={14} /></Link></div>
        {!rows.length ? <p className="muted small pad">No meetings yet. Your first General Meeting will show up here.</p> : (
          <div className="rec-table" role="table">
            <div className="rec-tr rec-th" role="row"><span>Date</span><span>Activity</span><span>Result</span><span>Stickers</span><span>Total · Rank</span></div>
            {rows.map((r) => (
              <div key={r.key} className={`rec-tr${r.ok ? '' : ' is-miss'}`} role="row">
                <span className="rec-date">{fmtDate(r.date)}</span>
                <span className="rec-act"><strong>{r.title}</strong><small>{KIND[r.kind]}{r.by ? ` · by ${r.by}` : ''}</small></span>
                <span><em className={`rec-res res-${r.result.toLowerCase().replace(/\s+/g, '-')}`}>{r.result}</em></span>
                <span className="rec-st">{r.stickers ? `+${r.stickers}` : '0'}</span>
                <span className="rec-rank"><b>{r.total}</b><Medal rank={r.rank.toLowerCase()} size={13} />{r.rank}</span>
              </div>
            ))}
          </div>
        )}
        <p className="muted small rec-note">Missing a meeting you attended? Tell the Secretary. Attendance marked “Present” adds the sticker automatically.</p>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panel-head"><h2>Merch requests</h2><Link to="/apparel" className="more">LPS Merch<Icon name="arrow" size={14} /></Link></div>
        {!rec.merch.length ? <p className="muted small pad">No requests yet.</p> : (
          <div className="rec-table" role="table">
            <div className="rec-tr rec-th rec-m" role="row"><span>Requested</span><span>Item</span><span>Stickers then</span><span>Rank then</span><span>Status</span></div>
            {[...rec.merch].reverse().map((m) => (
              <div key={m.key} className="rec-tr rec-m" role="row">
                <span className="rec-date">{fmtDate(m.date)}</span>
                <span className="rec-act"><strong>{m.item}</strong>{m.detail && <small>{m.detail}</small>}</span>
                <span className="rec-st">{m.totalThen}</span>
                <span className="rec-rank"><Medal rank={m.rankThen.toLowerCase()} size={13} />{m.rankThen}</span>
                <span><em className="rec-res">{m.status}</em><small className="rec-upd">{fmtDate(m.updated, { month: 'short', day: 'numeric' })}</small></span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
