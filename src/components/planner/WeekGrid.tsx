import {useState,type CSSProperties} from 'react'
import {DAYS,clock,prettyTime,minutes,slotsForDay,type Course} from '@/lib/planner/model'

export function WeekGrid({courses,onEdit,highlight}:{courses:Course[];onEdit:(c:Course)=>void;highlight:string|null}) {
 const [view,setView]=useState<'week'|'day'>(()=>typeof window!=='undefined'&&window.matchMedia('(max-width:600px)').matches?'day':'week')
 const [day,setDay]=useState(0),[weekends,setWeekends]=useState(false)
 const included=courses.filter(c=>c.included),allMeetings=included.flatMap(c=>c.meetings)
 const hasWeekend=allMeetings.some(m=>m.days.some(d=>d>4)),days=weekends||hasWeekend?7:5
 const from=Math.min(8*60,...allMeetings.map(m=>Math.floor(minutes(m.start)/60)*60))
 const to=Math.max(18*60,...allMeetings.map(m=>Math.ceil(minutes(m.end)/60)*60))
 const px=1.05, height=(to-from)*px
 const shown=view==='day'?[day]:Array.from({length:days},(_,i)=>i)
 return <section className="planner-calendar" aria-label="Weekly class schedule">
  <div className="planner-calendar-toolbar"><div><h2>Your week, at a glance</h2><p>Recurring class times · Eastern Time</p></div><div className="planner-view-controls"><div className="planner-segment" aria-label="Calendar view"><button aria-pressed={view==='week'} onClick={()=>setView('week')}>Week</button><button aria-pressed={view==='day'} onClick={()=>setView('day')}>Day</button></div><button className="planner-text-button" aria-pressed={weekends||hasWeekend} disabled={hasWeekend} onClick={()=>setWeekends(!weekends)}>{weekends||hasWeekend?'7 days':'Mon–Fri'}</button></div></div>
  {view==='day'&&<div className="planner-day-tabs" aria-label="Choose day">{DAYS.map((d,i)=><button key={d} aria-pressed={day===i} onClick={()=>setDay(i)}>{d}</button>)}</div>}
  <div className={`planner-week-scroll ${view==='day'?'is-day':''}`} tabIndex={view==='week'?0:undefined} aria-label={view==='week'?'Weekly grid; scroll horizontally on small screens':'Daily grid'}>
   <div className="planner-week" style={{'--day-count':shown.length} as CSSProperties}>
    <div className="planner-time-heading">ET</div>{shown.map(d=><div className="planner-day-heading" key={d}><b>{DAYS[d]}</b><span>{slotsForDay(courses,d).length} {slotsForDay(courses,d).length===1?'class':'classes'}</span></div>)}
    <div className="planner-time-axis" style={{height}}>{Array.from({length:(to-from)/60+1},(_,i)=><span key={i} style={{top:i*60*px}}>{prettyTime(clock(from+i*60)).replace(':00','')}</span>)}</div>
    {shown.map(d=><div key={d} className="planner-day-column" style={{height,backgroundSize:`100% ${30*px}px`}} aria-label={DAYS[d]}>
     {slotsForDay(courses,d).map(slot=><button key={`${slot.course.id}:${slot.meeting.id}`} className={`planner-block${slot.conflict?' has-conflict':''}${highlight===slot.course.id?' is-highlighted':''}${slot.end-slot.start<70?' is-compact':''}${slot.end-slot.start<40?' is-short':''}${slot.end-slot.start<20?' is-tiny':''}`} onClick={()=>onEdit(slot.course)} style={{top:(slot.start-from)*px,height:Math.max(6,(slot.end-slot.start)*px-2),left:`calc(${slot.lane/slot.lanes*100}% + 3px)`,width:`calc(${100/slot.lanes}% - 6px)`,'--course':slot.course.color} as CSSProperties} aria-label={`${slot.course.code}, ${DAYS[d]}, ${prettyTime(slot.meeting.start)} to ${prettyTime(slot.meeting.end)}${slot.conflict?', time conflict':''}. Edit course.`} title={`${slot.course.code}: ${slot.course.title}\n${prettyTime(slot.meeting.start)}–${prettyTime(slot.meeting.end)}\n${slot.meeting.location}${slot.conflict?'\nTime conflict':''}`}>
      <b>{slot.conflict?'! ':''}{slot.course.code}</b><span>{slot.course.title}</span><small>{slot.meeting.start}–{slot.meeting.end}</small>{slot.end-slot.start>=60&&slot.meeting.location&&<small>{slot.meeting.location}</small>}
     </button>)}
    </div>)}
   </div>
  </div>
  {!allMeetings.length&&<p className="planner-calendar-empty">Add a course with meeting times to build your week. Asynchronous and excluded courses stay in your course list.</p>}
 </section>
}
