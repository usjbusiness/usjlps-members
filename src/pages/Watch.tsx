import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLiveNow, useMe } from '@/lib/api'
import { Icon } from '@/components/ui'

export function Watch() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'library' ? 'library' : 'live'
  const live = useLiveNow().data
  const me = useMe().data
  // The live app shows this name in the chat and on the leaderboard.
  useEffect(() => {
    const n = me?.member?.full_name ?? me?.board?.full_name
    try { if (n && !localStorage.getItem('usj-live-name')) localStorage.setItem('usj-live-name', n.slice(0, 40)) } catch { /* ignore */ }
  }, [me])
  const src = useMemo(() => (tab === 'library' ? '/live/archive' : '/live/'), [tab])
  return (
    <div className="watch">
      <div className="watch-bar">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'live'} className={tab === 'live' ? 'on' : ''} onClick={() => setParams({})}>{live?.live && <b className="live-dot" />}Live session</button>
          <button role="tab" aria-selected={tab === 'library'} className={tab === 'library' ? 'on' : ''} onClick={() => setParams({ tab: 'library' })}>Library</button>
        </div>
        <p className="watch-status">
          {tab === 'live' ? (live?.live ? <><b className="live-dot" /> Live now: <strong>{live.title ?? 'Live session'}</strong></> : 'No session right now. When the e-board starts one, it appears here automatically.')
            : 'Every presentation and simulation we have run, saved for you.'}
        </p>
        <a className="btn btn-ghost btn-sm" href={src} target="_blank" rel="noopener">Full screen<Icon name="ext" size={14} /></a>
      </div>
      <iframe key={src} className="watch-frame" src={src} title={tab === 'library' ? 'LPS Library' : 'LPS Live session'} allow="fullscreen; clipboard-write" />
      <p className="watch-tip"><Icon name="star" size={13} /> Polls, quizzes and simulations (like the trading game) run inside live sessions. Vote and play right here.</p>
    </div>
  )
}
