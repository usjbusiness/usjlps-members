import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { APPAREL_STATUS, useMe } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { COLORS, Pin, Polo, type ColorKey } from '@/components/Apparel'
import { Icon, PageHead, useToast } from '@/components/ui'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
type Item = 'pin' | 'polo'
const ITEMS: Record<Item, { name: string; tag: string; min: number; rank: string; colors: ColorKey[]; lines: string[] }> = {
  pin: { name: 'The LPS Pin', tag: 'Bronze reward', min: 3, rank: 'Bronze', colors: [],
    lines: ['Gold-plated lapel pin with the LPS monogram', 'Ivy-green hard enamel, butterfly clutch back', 'Comes with an LPS sticker for your laptop'] },
  polo: { name: 'The LPS Polo', tag: 'Silver reward', min: 6, rank: 'Silver', colors: ['black', 'ivy', 'white'],
    lines: ['Embroidered LPS monogram on the left chest', 'Breathable piqué knit, three-button placket', 'Made for Headliners, trips and interviews'] },
}

function Product({ item }: { item: Item }) {
  const me = useMe().data!
  const qc = useQueryClient(); const toast = useToast()
  const def = ITEMS[item]
  const [color, setColor] = useState<ColorKey>(def.colors[0] ?? 'black')
  const [size, setSize] = useState('')
  const [busy, setBusy] = useState(false)
  const unlocked = me.total >= def.min
  const left = def.min - me.total
  const req = me.requests.find((x) => x.item === item)
  const request = async () => {
    if (item === 'polo' && !size) { toast.error('Choose your size first.'); return }
    setBusy(true)
    const { error } = await supabase.rpc('request_apparel', { p_item: item, p_size: item === 'polo' ? size : null, p_color: item === 'polo' ? color : null, p_note: null })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.ok(`${def.name} requested. The e-board will let you know when it is ready.`)
    qc.invalidateQueries({ queryKey: ['me'] })
  }
  const cancel = async () => {
    if (!req) return
    setBusy(true)
    const { error } = await supabase.rpc('cancel_apparel_request', { p_id: req.id })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.ok('Request cancelled.'); qc.invalidateQueries({ queryKey: ['me'] })
  }
  return (
    <article className="product">
      <div className={`product-stage bg-${item === 'pin' ? 'black' : color}`}>
        <span className="product-tag">{def.tag}</span>
        {item === 'polo' ? <Polo color={color} className="product-img" /> : <Pin className="product-img is-pin" />}
      </div>
      <div className="product-info">
        <h2>{def.name}</h2>
        <ul>{def.lines.map((l) => <li key={l}><Icon name="check" size={14} />{l}</li>)}</ul>
        {def.colors.length > 0 && <div className="opt"><span>Color · <b>{COLORS[color].name}</b> <small>({COLORS[color].note})</small></span>
          <div className="swatches">{def.colors.map((c) => <button key={c} className={`sw sw-${c}${c === color ? ' on' : ''}`} onClick={() => setColor(c)} aria-label={COLORS[c].name} title={COLORS[c].name} />)}</div>
        </div>}
        {item === 'polo' && <div className="opt"><span>Size</span><div className="sizes">{SIZES.map((s) => <button key={s} className={s === size ? 'on' : ''} onClick={() => setSize(s)}>{s}</button>)}</div></div>}
        {req ? (
          <div className="req-state">
            <span className={`chip chip-st-${req.status}`}>{APPAREL_STATUS[req.status] ?? req.status}</span>
            <span>{[req.size, req.color ? COLORS[req.color as ColorKey]?.name : null].filter(Boolean).join(' · ')}</span>
            {req.status === 'requested' && <button className="link" disabled={busy} onClick={cancel}>Cancel request</button>}
          </div>
        ) : unlocked ? (
          <button className="btn btn-gold btn-block" disabled={busy || !me.member} onClick={request}>{busy ? 'Sending…' : `Request my ${item}`}</button>
        ) : (
          <div className="locked"><Icon name="lock" size={16} /><span>Unlocks at <b>{def.rank}</b> ({def.min} stickers). {`${left} more sticker${left === 1 ? '' : 's'} to go.`} <Link to="/rank">See my stickers</Link></span></div>
        )}
      </div>
    </article>
  )
}

export function ApparelPage() {
  const me = useMe().data!
  const oldCap = me.requests.find((x) => x.item === 'cap')
  return (
    <div className="page">
      <PageHead eyebrow="Earned, not bought" title="LPS Merch" sub="Reach Bronze (3 stickers) for the LPS pin and sticker. Reach Silver (6 stickers) for the LPS polo. One of each per member." />
      {oldCap && <p className="notice">Your earlier cap request is still on file: <b>{APPAREL_STATUS[oldCap.status] ?? oldCap.status}</b>.</p>}
      <div className="products"><Product item="pin" /><Product item="polo" /></div>
      <section className="howto">
        <div><b>1</b><strong>Earn stickers</strong><span>Come to General Meetings and events. Headliners count double.</span></div>
        <div><b>2</b><strong>Request in one tap</strong><span>3 stickers unlock the pin, 6 unlock the polo.</span></div>
        <div><b>3</b><strong>Pick it up</strong><span>We will tell you when it is ready at the next meeting.</span></div>
      </section>
      <p className="muted small">Merch is funded through the SGA budget once the Society is recognized. Final colors and details may change slightly with the supplier.</p>
    </div>
  )
}
