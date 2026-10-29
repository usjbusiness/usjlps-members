export const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as const
export const COLORS = ['#88B7EC','#8DCCA9','#C4A5E8','#E7BB79','#EB9EA8','#79C9CA','#B9C981','#D1AF91']
export interface Meeting { id:string; days:number[]; start:string; end:string; location:string }
export interface Course { id:string; code:string; title:string; section:string; crn:string; credits:number; instructor:string; color:string; included:boolean; meetings:Meeting[]; notes:string }
export interface Plan { id:string; name:string; term:string; startDate:string; endDate:string; courses:Course[] }
export interface PlannerData { version:1; activeId:string; plans:Plan[] }
export const uid = () => crypto.randomUUID()
export const minutes = (time:string) => Number(time.slice(0,2))*60 + Number(time.slice(3,5))
export const clock = (n:number) => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`
export const prettyTime = (s:string) => { const h=Number(s.slice(0,2))%24;return `${h%12||12}:${s.slice(3,5)} ${h<12?'AM':'PM'}` }
export function newPlan(name='Plan A',term=''):Plan { return {id:uid(),name,term,startDate:'',endDate:'',courses:[]} }
export function emptyPlanner():PlannerData { const plan=newPlan();return {version:1,activeId:plan.id,plans:[plan]} }
export function newCourse(index=0):Course { return {id:uid(),code:'',title:'',section:'',crn:'',credits:3,instructor:'',color:COLORS[index%COLORS.length],included:true,meetings:[{id:uid(),days:[0,2,4],start:'09:00',end:'09:50',location:''}],notes:''} }
export function validateCourse(c:Course):string|null {
 if(!c.code.trim()||!c.title.trim()) return 'Enter a course code and title.'
 if(!Number.isFinite(c.credits)||c.credits<0||c.credits>30) return 'Credits must be between 0 and 30.'
 if(c.crn && !/^\d{3,10}$/.test(c.crn)) return 'A CRN must contain 3–10 digits. Leave it blank if unknown.'
 for(const m of c.meetings) {
  if(!m.days.length) return 'Choose at least one day for every meeting.'
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(m.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(m.end)||minutes(m.end)<=minutes(m.start)) return 'Each meeting must end after it starts, on the same day.'
 }
 return null
}
export interface Slot { course:Course; meeting:Meeting; day:number; start:number; end:number; lane:number; lanes:number; conflict:boolean }
export function conflicts(courses:Course[]) {
 const items=courses.filter(c=>c.included).flatMap(course=>course.meetings.flatMap(meeting=>meeting.days.map(day=>({course,meeting,day,start:minutes(meeting.start),end:minutes(meeting.end)}))))
 const found:{a:Course;b:Course;day:number;start:number;end:number}[]=[]
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j]
  if(a.day===b.day&&a.start<b.end&&b.start<a.end) found.push({a:a.course,b:b.course,day:a.day,start:Math.max(a.start,b.start),end:Math.min(a.end,b.end)})
 }
 return found
}
export function slotsForDay(courses:Course[],day:number):Slot[] {
 const slots:Slot[]=courses.filter(c=>c.included).flatMap(course=>course.meetings.filter(m=>m.days.includes(day)).map(meeting=>({course,meeting,day,start:minutes(meeting.start),end:minutes(meeting.end),lane:0,lanes:1,conflict:false}))).sort((a,b)=>a.start-b.start||a.end-b.end)
 let group:Slot[]=[];let ends:number[]=[];let groupEnd=-1
 function finish(){ for(const item of group) {item.lanes=ends.length;item.conflict=group.some(other=>other!==item&&item.start<other.end&&other.start<item.end)} }
 for(const item of slots){
  if(item.start>=groupEnd){finish();group=[];ends=[];groupEnd=-1}
  let lane=ends.findIndex(end=>end<=item.start);if(lane===-1)lane=ends.length
  item.lane=lane;ends[lane]=item.end;group.push(item);groupEnd=Math.max(groupEnd,item.end)
 }finish();return slots
}
export function parsePlanner(value:unknown):PlannerData {
 const fail=()=>{throw new Error('This is not a valid planner backup. Nothing was changed.')}
 if(!value||typeof value!=='object')return fail()
 const data=value as PlannerData
 if(data.version!==1||!Array.isArray(data.plans)||!data.plans.length||data.plans.length>12)return fail()
 const str=(v:unknown,max=500)=>typeof v==='string'&&v.length<=max
 const id=(v:unknown)=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v)
 const date=(v:string)=>v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v)
 const plans:Plan[]=data.plans.map(p=>{
  if(!p||!id(p.id)||!str(p.name,80)||!str(p.term,80)||!str(p.startDate,10)||!str(p.endDate,10)||!date(p.startDate)||!date(p.endDate)||!Array.isArray(p.courses)||p.courses.length>60)return fail()
  const courses:Course[]=p.courses.map(c=>{
   if(!c||!id(c.id)||!str(c.code,40)||!str(c.title,200)||!str(c.section,40)||!str(c.crn,10)||!str(c.instructor,120)||!str(c.notes,2000)||!/^#[\da-fA-F]{6}$/.test(c.color)||typeof c.included!=='boolean'||!Array.isArray(c.meetings)||c.meetings.length>10)return fail()
   const meetings=c.meetings.map(m=>{if(!m||!id(m.id)||!str(m.location,160)||!str(m.start,5)||!str(m.end,5)||!Array.isArray(m.days)||m.days.some(d=>!Number.isInteger(d)||d<0||d>6))return fail();return {id:m.id,location:m.location,start:m.start,end:m.end,days:[...new Set(m.days)]}})
   const clean:Course={id:c.id,code:c.code,title:c.title,section:c.section,crn:c.crn,credits:c.credits,instructor:c.instructor,color:c.color,included:c.included,meetings,notes:c.notes}
   if(validateCourse(clean)||new Set(meetings.map(m=>m.id)).size!==meetings.length)return fail();return clean
  })
  if(new Set(courses.map(c=>c.id)).size!==courses.length)return fail()
  return {id:p.id,name:p.name,term:p.term,startDate:p.startDate,endDate:p.endDate,courses}
 })
 if(new Set(plans.map(p=>p.id)).size!==plans.length||!plans.some(p=>p.id===data.activeId))return fail()
 return {version:1,activeId:data.activeId,plans}
}
export function duplicatePlan(plan:Plan):Plan { return {...plan,id:uid(),name:`${plan.name.slice(0,65)} copy`,courses:plan.courses.map(c=>({...c,id:uid(),meetings:c.meetings.map(m=>({...m,id:uid(),days:[...m.days]}))}))} }
const escapeICS=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,')
export function calendarFile(plan:Plan):string {
 if(!plan.startDate||!plan.endDate||plan.startDate>plan.endDate)throw new Error('Set a valid first and last day of classes under Term settings before exporting.')
 const first=Date.parse(plan.startDate+'T12:00:00Z'),last=Date.parse(plan.endDate+'T12:00:00Z')
 const offset=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',timeZoneName:'longOffset'}).formatToParts(new Date(plan.endDate+'T12:00:00Z')).find(p=>p.type==='timeZoneName')!.value.replace('GMT','')
 const until=new Date(plan.endDate+'T23:59:59'+offset).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
 const stamp=(date:Date)=>date.toISOString().slice(0,10).replace(/-/g,'')
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//USJ LPS//Personal Planner//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:'+escapeICS(plan.name),'X-WR-TIMEZONE:America/New_York']
 for(const c of plan.courses.filter(c=>c.included))for(const m of c.meetings)for(const day of m.days){
  const date=new Date(first);date.setUTCDate(date.getUTCDate()+(day-(date.getUTCDay()+6)%7+7)%7);if(date.getTime()>last)continue
  lines.push('BEGIN:VEVENT',`UID:${c.id}-${m.id}-${day}@lps-planner`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART;TZID=America/New_York:${stamp(date)}T${m.start.replace(':','')}00`,`DTEND;TZID=America/New_York:${stamp(date)}T${m.end.replace(':','')}00`,`RRULE:FREQ=WEEKLY;UNTIL=${until}`,`SUMMARY:${escapeICS(c.code+' — '+c.title)}`,`LOCATION:${escapeICS(m.location)}`,'DESCRIPTION:'+escapeICS('Planning copy only. Confirm dates, holidays, and registration in official MyUSJ.'),'END:VEVENT')
 }
 if(lines.length===6)throw new Error('This plan has no included class meetings within the selected dates.')
 lines.push('END:VCALENDAR')
 // RFC 5545: fold long content lines without splitting a UTF-8 code point.
 const encoder=new TextEncoder()
 return lines.map(line=>{let part='',size=0;const parts:string[]=[];for(const char of line){const bytes=encoder.encode(char).length;if(size+bytes>73){parts.push(part);part=' ';size=1}part+=char;size+=bytes}parts.push(part);return parts.join('\r\n')}).join('\r\n')+'\r\n'
}
export function download(name:string,text:string,type:string){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
