import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const url=js=>'data:text/javascript;base64,'+Buffer.from(js).toString('base64')
const transpile=file=>ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText
const model=url(transpile('../src/lib/planner/model.ts'))
const {plannerPrintBody,plannerPrintDocument,printEscape}=await import(url(transpile('../src/lib/planner/print.ts').replace("'./model'",JSON.stringify(model))))
const c={id:'c',code:'MGMT 250',title:'International Business',section:'02',crn:'45678',credits:3,instructor:'Professor Example',color:'#88B7EC',included:true,notes:'Discuss prerequisites',meetings:[{id:'m',days:[0,2],start:'11:00',end:'11:50',location:'Hall 101'}]}
const p={id:'p',name:'Primary plan',term:'Spring 2027',startDate:'2027-01-19',endDate:'2027-05-07',courses:[c]}
const o={activeId:'p',student:'Student Example',note:'Review electives',labels:{p:'First choice'},generatedAt:new Date('2026-11-01T15:00:00Z')}
const body=(plan=p,options=o)=>plannerPrintBody([plan],options)
test('includes full course title, section, professor, CRN and room',()=>{const s=body();for(const value of ['International Business','02','Professor Example','45678','Hall 101'])assert(s.includes(value))})
test('contains plan name, semester, custom label and student',()=>{const s=body();for(const value of ['Primary plan','Spring 2027','First choice','Student Example','Review electives'])assert(s.includes(value))})
test('excluded courses omitted from schedule and course details',()=>{const s=body({...p,courses:[c,{...c,id:'excluded',included:false,code:'HIDDEN_SENTINEL',instructor:'SECRET_INSTRUCTOR',notes:'SECRET_NOTE'}]});for(const v of ['HIDDEN_SENTINEL','SECRET_INSTRUCTOR','SECRET_NOTE'])assert(!s.includes(v));assert(s.includes('1 excluded course'))})
test('missing instructor and section explicitly marked',()=>assert(body({...p,courses:[{...c,section:'',instructor:'',crn:''}]}).includes('Not specified')))
test('asynchronous courses are included in list and credits',()=>{const s=body({...p,courses:[{...c,meetings:[]}]});assert(s.includes('Asynchronous / time to be arranged'));assert(s.includes('3 credits'));assert(s.includes('No scheduled classes'))})
test('weekend meetings automatically include Saturday and Sunday',()=>{const s=body({...p,courses:[{...c,meetings:[{...c.meetings[0],days:[5,6]}]}]});assert(s.includes('>Sat</th>'));assert(s.includes('>Sun</th>'))})
test('all meeting patterns included in detail table',()=>{const s=body({...p,courses:[{...c,meetings:[...c.meetings,{id:'lab',days:[4],start:'14:00',end:'16:00',location:'Lab 202'}]}]});assert(s.includes('Lab 202'));assert(s.includes('2:00 PM–4:00 PM'));assert(s.includes('Mon / Wed'))})
test('all chosen plans have separate, named sections in order',()=>{const s=plannerPrintBody([p,{...p,id:'b',name:'Backup'}],o);assert.equal((s.match(/class="pp-plan"/g)||[]).length,2);assert(s.includes('Plan 2 of 2'));assert(s.includes('Alternative'));assert(s.indexOf('Primary plan')<s.indexOf('Backup'))})
test('empty plan gets explicit message, not a blank page',()=>assert(body({...p,courses:[]}).includes('No included courses in this plan')))
test('zero selection has explicit message',()=>assert(plannerPrintBody([],o).includes('No plans selected')))
test('overlaps preserved and flagged, not silently resolved',()=>{const s=body({...p,courses:[c,{...c,id:'other',code:'ECON 102',section:'03'}]});assert(s.includes('Time overlaps to review'));assert(s.includes('ECON 102'))})
test('course references are stable and match the detailed rows',()=>{const s=body();assert(s.includes('[1] MGMT 250'));assert(s.includes('class="pp-ref">[1]'))})
test('untrusted text cannot inject HTML or scripts',()=>{const attack='</style><script>alert("x")</script>';const s=body({...p,name:attack,courses:[{...c,instructor:attack,notes:attack}]},{...o,student:attack,note:attack,labels:{p:attack}});assert(!s.includes('<script>'));assert(s.includes('&lt;script&gt;'));assert.equal(printEscape('A&B <tag>'), 'A&amp;B &lt;tag&gt;')})
test('generation never mutates any source plan',()=>{const before=JSON.stringify(p);body();assert.equal(JSON.stringify(p),before)})
test('long course lists retain every included course',()=>{const s=body({...p,courses:Array.from({length:60},(_,i)=>({...c,id:String(i),code:'COURSE-'+i}))});for(let i=0;i<60;i++)assert(s.includes('[${i+1}]'.replace('${i+1}',String(i+1))+' COURSE-'+i))})
test('document includes standalone styling and print title, no remote dependencies',()=>{const s=plannerPrintDocument([p],o,'.pp-root{color:black}');assert(s.startsWith('<!doctype html>'));assert(s.includes('<title>LPS — Primary plan — Advising copy</title>'));assert(s.includes('.pp-root{color:black}'));assert(!s.includes('<script'));assert(!s.includes('https://'))})
