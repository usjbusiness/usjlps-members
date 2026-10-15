import { Link } from 'react-router-dom'
import type { MemberEvent } from '@/lib/api'
import { addToCalendar, fmtDate, fmtTime } from '@/lib/format'
import { EventPreregistration } from './EventPreregistration'
import { EventStatus } from './EventStatus'
import { Icon } from './ui'

/** Direct actions on Home; never wrap the card in a link containing buttons. */
export function HomeEvents({ events }: { events: MemberEvent[] }) {
  if (!events.length) return null
  return <section className="home-meetups" aria-labelledby="home-meetups-title">
    <div className="home-meetups-heading">
      <div><p className="eyebrow">Make room for what’s next</p><h2 id="home-meetups-title">See you at LPS.</h2></div>
      <Link to="/events" className="more">All events<Icon name="arrow" size={15} /></Link>
    </div>
    <div className="home-meetups-list">
      {events.map((e, i) => {
        const canPlan = ['tentative', 'scheduled', 'confirmed', 'upcoming'].includes(e.status) && new Date(e.starts_at).getTime() > Date.now()
        return <article key={`${e.kind}-${e.id}`} className={`home-meetup${i === 0 ? ' home-meetup-featured' : ''}`} aria-label={e.title}>
          <div className="home-meetup-top">
            <div className="home-meetup-date" aria-label={fmtDate(e.starts_at, { month: 'long', day: 'numeric', weekday: 'long' })}>
              <span>{fmtDate(e.starts_at, { month: 'short' })}</span><b>{fmtDate(e.starts_at, { day: 'numeric' })}</b><small>{fmtDate(e.starts_at, { weekday: 'short' })}</small>
            </div>
            <div className="home-meetup-copy">
              <div className="home-meetup-kicker"><span>{i === 0 ? 'Next on your calendar' : 'Also coming up'}</span><EventStatus status={e.status} /></div>
              <h3>{e.title}</h3>
              <p className="home-meetup-meta"><span><Icon name="clock" size={16} />{fmtTime(e.starts_at)}{e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ''}</span><span><Icon name="pin" size={16} />{e.location || 'Location to be announced'}</span></p>
              {e.headliner && <span className="home-meetup-headliner"><Icon name="star" size={14} />Headliner · double stickers for attending</span>}
            </div>
          </div>
          <EventPreregistration event={e} home />
          <div className="home-meetup-links">
            {canPlan && <button type="button" className="btn btn-ghost btn-sm" onClick={() => addToCalendar(e)}><Icon name="calendar" size={16} />Add to calendar</button>}
            <Link className="more" to="/events">Event details<Icon name="arrow" size={14} /></Link>
          </div>
        </article>
      })}
    </div>
  </section>
}
