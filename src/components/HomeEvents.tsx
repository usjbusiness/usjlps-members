import { useEffect, useId, useRef, useState } from 'react'
import { FeaturedGuest } from './FeaturedGuest'
import { Link } from 'react-router-dom'
import type { MemberEvent } from '@/lib/api'
import { addToCalendar, fmtDate, fmtTime } from '@/lib/format'
import { EventPreregistration } from './EventPreregistration'
import { EventStatus } from './EventStatus'
import { Icon } from './ui'

/** Native scroll + snap: works with touch, trackpad, buttons and keyboard. */
export function HomeEvents({ events }: { events: MemberEvent[] }) {
  const track = useRef<HTMLDivElement>(null)
  const trackId = useId()
  const [position, setPosition] = useState({ index: 0, left: false, right: false })
  useEffect(() => {
    const el = track.current
    if (!el) return
    const update = () => {
      const cards = Array.from(el.querySelectorAll<HTMLElement>('article'))
      const index = cards.reduce((best, card, i) => Math.abs(card.offsetLeft - el.scrollLeft) < Math.abs((cards[best]?.offsetLeft ?? 0) - el.scrollLeft) ? i : best, 0)
      setPosition({ index, left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update); ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [events.length])
  function move(direction: number) {
    const el = track.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('article')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: direction * ((card?.offsetWidth ?? el.clientWidth) + 14), behavior: reduce ? 'instant' : 'smooth' })
  }
  if (!events.length) return null
  return <section className="home-meetups" aria-labelledby="home-meetups-title">
    <div className="home-meetups-heading">
      <div><p className="eyebrow">Your next connection</p><h2 id="home-meetups-title">Coming up at LPS</h2></div>
      <div className="home-meetups-controls">
        <Link to="/events" className="more">All events<Icon name="arrow" size={14} /></Link>
        {events.length > 1 && (position.left || position.right) && <div className="meetup-arrows"><button type="button" aria-label="Previous event" aria-controls={trackId} disabled={!position.left} onClick={() => move(-1)}><Icon name="back" size={18} /></button><button type="button" aria-label="Next event" aria-controls={trackId} disabled={!position.right} onClick={() => move(1)}><Icon name="arrow" size={18} /></button></div>}
      </div>
    </div>
    <div ref={track} id={trackId} className="home-meetups-list" tabIndex={0} role="region" aria-label="Upcoming events — scroll horizontally" onKeyDown={e => {
      if (e.target !== e.currentTarget) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1) }
    }}>
      {events.map((e, i) => {
        const canPlan = ['tentative', 'scheduled', 'confirmed', 'upcoming'].includes(e.status) && new Date(e.starts_at).getTime() > Date.now()
        return <article key={`${e.kind}-${e.id}`} className="home-meetup" aria-label={e.title} aria-roledescription="slide" aria-description={`${i + 1} of ${events.length}`}>
          <div className="home-meetup-top">
            <div className="home-meetup-date" aria-label={fmtDate(e.starts_at, { month: 'long', day: 'numeric', weekday: 'long' })}>
              <span>{fmtDate(e.starts_at, { month: 'short' })}</span><b>{fmtDate(e.starts_at, { day: 'numeric' })}</b><small>{fmtDate(e.starts_at, { weekday: 'short' })}</small>
            </div>
            <div className="home-meetup-copy">
              <div className="home-meetup-kicker"><EventStatus status={e.status} />{e.headliner && <span className="home-meetup-headliner">Headliner ×2</span>}</div>
              <h3>{e.title}</h3>
              <p className="home-meetup-meta"><span><Icon name="clock" size={14} />{fmtTime(e.starts_at)}{e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ''}</span><span><Icon name="pin" size={14} />{e.location || 'Location to be announced'}</span></p>
            </div>
          </div>
          <FeaturedGuest event={e} />
          <EventPreregistration event={e} home />
          <div className="home-meetup-links">
            {canPlan && <button type="button" className="btn btn-ghost btn-sm" onClick={() => addToCalendar(e)}><Icon name="calendar" size={14} />Calendar</button>}
            <Link className="more" to="/events">Details<Icon name="arrow" size={14} /></Link>
          </div>
        </article>
      })}
    </div>
    <div className="home-meetups-footer">
      <span className="meetup-position" aria-live="polite">{events.length > 1 ? (position.left || position.right ? <>{Math.min(position.index + 1, events.length)} / {events.length}<span className="meetup-swipe-hint"> · Swipe or use arrows</span></> : `${events.length} upcoming events`) : 'Your next event'}</span>
      <button type="button" className="home-more-content" onClick={() => document.getElementById('home-below-events')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })}>More below<Icon name="down" size={15} /></button>
    </div>
  </section>
}
