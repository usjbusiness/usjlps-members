import {useEffect,useMemo,useRef,useState} from 'react'
import {plannerPrintBody,plannerPrintDocument} from '@/lib/planner/print'
import type {Plan} from '@/lib/planner/model'
import printStyles from '@/planner-print.css?inline'
import '@/planner-print.css'

export function PlannerPrintFallback({plan}:{plan:Plan}) {
 return <div className="planner-print-fallback" dangerouslySetInnerHTML={{__html:plannerPrintBody([plan],{activeId:plan.id,student:'',note:'',labels:{}})}}/>
}
export function PrintPlannerDialog({plans,activeId,onClose}:{plans:Plan[];activeId:string;onClose:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null),frame=useRef<HTMLIFrameElement>(null)
 const [selected,setSelected]=useState([activeId]),[student,setStudent]=useState(''),[note,setNote]=useState(''),[labels,setLabels]=useState<Record<string,string>>({}),[readyHTML,setReadyHTML]=useState(''),[error,setError]=useState('')
 const [layout,setLayout]=useState<'portrait'|'landscape'>('portrait')
 const chosen=plans.filter(p=>selected.includes(p.id))
 const html=useMemo(()=>plannerPrintDocument(plans.filter(p=>selected.includes(p.id)),{activeId,student,note,labels},printStyles.replace('size:portrait',`size:${layout}`)),[plans,selected,activeId,student,note,labels,layout])
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>previous?.focus()},[])
 const print=()=>{try{if(!frame.current?.contentWindow)throw new Error();frame.current.contentWindow.focus();frame.current.contentWindow.print();setError('')}catch{setError('The print dialog could not open. Try again in a standard browser tab.')}}
 return <dialog ref={dialog} className="planner-print-dialog" aria-labelledby="planner-print-title" onCancel={e=>{e.preventDefault();onClose()}}>
  <header className="planner-print-head"><div><p>SHARE WITH YOUR ADVISOR</p><h2 id="planner-print-title">Print / Save PDF</h2><span>A clean advising copy, with sections and professors.</span></div><button className="planner-icon" onClick={onClose} aria-label="Close print preview">×</button></header>
  <div className="planner-print-body"><section aria-label="Print options" className="planner-print-options"><div className="planner-print-choice-head"><h3>Choose plans</h3><div><button onClick={()=>setSelected([activeId])}>Current plan</button><button onClick={()=>setSelected(plans.map(p=>p.id))}>Select all plans</button></div></div>
   <label className="planner-print-layout">Page layout<select value={layout} onChange={e=>setLayout(e.target.value as 'portrait'|'landscape')}><option value="portrait">Portrait — recommended for advisor copies</option><option value="landscape">Landscape — wider tables</option></select></label>
   <div className="planner-print-choices">{plans.map(p=><div key={p.id} className="planner-print-choice"><label><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>setSelected(ids=>ids.includes(p.id)?ids.filter(id=>id!==p.id):[...ids,p.id])}/><span><strong>{p.name||'Untitled plan'}</strong><small>{p.term||'Semester not specified'} · {p.courses.filter(c=>c.included).length} included courses{p.id===activeId?' · Current plan':''}</small></span></label>{selected.includes(p.id)&&<label className="planner-print-label">Label for this plan<input aria-label={`Print label for ${p.name||'Untitled plan'}`} maxLength={80} placeholder={p.id===activeId?'Current plan — e.g. First choice':'Alternative — e.g. Backup option'} value={labels[p.id]??''} onChange={e=>setLabels({...labels,[p.id]:e.target.value})}/></label>}</div>)}</div>
   <div className="planner-print-personal"><label>Student name (optional)<input maxLength={120} value={student} onChange={e=>setStudent(e.target.value)} autoComplete="off"/></label><label>Note for advisor (optional)<textarea maxLength={1000} rows={2} value={note} onChange={e=>setNote(e.target.value)}/></label></div>
   <p className="planner-print-help">Only checked plans and their included courses are printed. Course search and Week / Day view do not limit the document. Each plan starts on a new page; longer course lists continue onto additional pages. Labels and notes here are for this print session only.</p></section>
   <section className="planner-print-preview" aria-label="Document preview"><h3>Document preview <span>{chosen.length} {chosen.length===1?'plan':'plans'} selected</span></h3>{chosen.length?<iframe ref={frame} title="Advising document preview" sandbox="allow-same-origin allow-modals" srcDoc={html} onLoad={()=>setReadyHTML(html)}/>:<p className="planner-print-no-selection" role="status">Select at least one plan to prepare a document.</p>}</section>
  </div><footer className="planner-print-foot"><div><p>{error||'Choose “Save as PDF” in the print dialog to email your advisor.'}</p><small>{layout==='portrait'?'Portrait':'Landscape'} layout · You can turn off browser headers and footers.</small></div><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-gold" disabled={!chosen.length||readyHTML!==html} onClick={print}>Print / Save PDF{chosen.length>1?` (${chosen.length} plans)`:''}</button></footer>
 </dialog>
}
