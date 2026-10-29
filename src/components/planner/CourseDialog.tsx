import {useEffect,useRef,useState} from 'react'
import {COLORS,DAYS,uid,validateCourse,type Course} from '@/lib/planner/model'

export function CourseDialog({course,onSave,onClose}:{course:Course;onSave:(c:Course)=>string|null;onClose:()=>void}) {
 const [draft,setDraft]=useState<Course>(()=>structuredClone(course)),[error,setError]=useState('')
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;ref.current?.showModal();return()=>{previous?.focus()}},[])
 function patch(p:Partial<Course>){setDraft({...draft,...p})}
 return <dialog className="planner-dialog" ref={ref} onCancel={e=>{e.preventDefault();onClose()}} aria-labelledby="course-dialog-title">
  <form onSubmit={e=>{e.preventDefault();const clean={...draft,code:draft.code.trim().toUpperCase(),title:draft.title.trim(),crn:draft.crn.trim()};const issue=validateCourse(clean)||onSave(clean);if(issue)setError(issue)}}>
   <header><div><p className="eyebrow">BUILD YOUR WEEK</p><h2 id="course-dialog-title">Course details</h2></div><button type="button" className="planner-icon" aria-label="Close course details" onClick={onClose}>×</button></header>
   <p className="planner-subtle">Enter details from official MyUSJ. This does not register you for a class.</p>
   <div className="planner-form-grid">
    <label>Course code<input autoFocus required maxLength={40} placeholder="e.g. ENGL 101" value={draft.code} onChange={e=>patch({code:e.target.value})}/></label>
    <label>Section<input maxLength={40} placeholder="e.g. 01" value={draft.section} onChange={e=>patch({section:e.target.value})}/></label>
    <label className="wide">Course title<input required maxLength={200} placeholder="Course title" value={draft.title} onChange={e=>patch({title:e.target.value})}/></label>
    <label>CRN / registration number<input inputMode="numeric" maxLength={10} placeholder="Optional" value={draft.crn} onChange={e=>patch({crn:e.target.value})}/></label>
    <label>Credits<input type="number" required min={0} max={30} step="0.5" value={Number.isNaN(draft.credits)?'':draft.credits} onChange={e=>patch({credits:e.target.value===''?NaN:Number(e.target.value)})}/></label>
    <label className="wide">Instructor<input maxLength={120} placeholder="Optional" value={draft.instructor} onChange={e=>patch({instructor:e.target.value})}/></label>
   </div>
   <fieldset className="planner-colors"><legend>Course color</legend>{COLORS.map((color,i)=><button key={color} type="button" style={{background:color}} className={draft.color===color?'chosen':''} aria-label={`Color ${i+1}`} aria-pressed={draft.color===color} onClick={()=>patch({color})}>{draft.color===color?'✓':''}</button>)}</fieldset>
   <div className="planner-section-head"><h3>Meeting times</h3><button type="button" className="planner-text-button" disabled={draft.meetings.length>=10} onClick={()=>patch({meetings:[...draft.meetings,{id:uid(),days:[1,3],start:'11:00',end:'12:15',location:''}]})}>+ Add meeting</button></div>
   <p className="planner-subtle">Add separate lecture and lab times. Remove all meetings for an asynchronous or arranged course.</p>
   {draft.meetings.map((m,i)=><fieldset className="planner-meeting-form" key={m.id}><legend>Meeting {i+1}</legend>
    <div className="planner-days">{DAYS.map((d,index)=><label key={d}><input type="checkbox" checked={m.days.includes(index)} onChange={()=>patch({meetings:draft.meetings.map(x=>x.id===m.id?{...x,days:x.days.includes(index)?x.days.filter(v=>v!==index):[...x.days,index].sort()}:x)})}/><span>{d}</span></label>)}</div>
    <div className="planner-form-grid"><label>Starts<input type="time" required value={m.start} onChange={e=>patch({meetings:draft.meetings.map(x=>x.id===m.id?{...x,start:e.target.value}:x)})}/></label><label>Ends<input type="time" required value={m.end} onChange={e=>patch({meetings:draft.meetings.map(x=>x.id===m.id?{...x,end:e.target.value}:x)})}/></label><label className="wide">Location<input maxLength={160} placeholder="Building / room / online" value={m.location} onChange={e=>patch({meetings:draft.meetings.map(x=>x.id===m.id?{...x,location:e.target.value}:x)})}/></label></div>
    <button type="button" className="planner-text-button danger" onClick={()=>patch({meetings:draft.meetings.filter(x=>x.id!==m.id)})}>Remove meeting</button>
   </fieldset>)}
   {!draft.meetings.length&&<p className="planner-info">No fixed meeting times. This course counts toward credits but does not appear on the weekly grid.</p>}
   <label className="planner-notes-label">Notes<textarea maxLength={2000} rows={2} placeholder="Questions for your advisor, requirements to check…" value={draft.notes} onChange={e=>patch({notes:e.target.value})}/></label>
   {error&&<p role="alert" className="planner-error">{error}</p>}
   <footer><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-gold">Save course</button></footer>
  </form>
 </dialog>
}
