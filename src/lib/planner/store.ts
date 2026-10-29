import {useEffect,useRef,useState} from 'react'
import {supabase} from '../supabase'
import {emptyPlanner,parsePlanner,type PlannerData} from './model'

export function usePlannerStore(userId:string) {
 const key=`lps-planner-v1:${userId}`
 const initial=useRef<PlannerData|null>(null)
 const restoreError=useRef('')
 const hadLocal=useRef(false)
 if(!initial.current){try{const raw=localStorage.getItem(key);initial.current=raw?parsePlanner(JSON.parse(raw)):emptyPlanner();hadLocal.current=!!raw}catch{restoreError.current='Device storage could not be read. Export a backup before leaving this page.';initial.current=emptyPlanner()}}
 const [data,setData]=useState<PlannerData>(initial.current)
 const [localError,setLocalError]=useState(restoreError.current)
 const [cloud,setCloud]=useState<'checking'|'ready'|'unavailable'|'saving'>('checking')
 const [message,setMessage]=useState('Saved on this device')
 const remote=useRef<{payload:PlannerData;updated_at:string}|null>(null)
 const revision=useRef<string|null>(null)
 const edits=useRef(0)
 const dataRef=useRef(data);dataRef.current=data
 useEffect(()=>{
  let cancelled=false
  supabase.from('member_schedule_planners').select('payload,updated_at').eq('user_id',userId).maybeSingle().then(({data:row,error})=>{
   if(cancelled)return
   if(error){setCloud('unavailable');return}
   try {if(row){remote.current={payload:parsePlanner(row.payload),updated_at:row.updated_at};revision.current=row.updated_at
    if(!hadLocal.current&&edits.current===0){
     const next=remote.current.payload;dataRef.current=next;setData(next)
     try{localStorage.setItem(key,JSON.stringify(next));setLocalError('');setMessage('Account copy loaded on this device')}catch{setLocalError('Account copy loaded, but device storage is unavailable. Export a backup before leaving.')}
    }else{setMessage('Device plans kept. An account copy is available under Load account copy.')}
   }}catch{setCloud('unavailable');return}
   setCloud('ready')
  })
  return()=>{cancelled=true}
 },[userId])
 function update(next:PlannerData){
  edits.current++;dataRef.current=next;setData(next)
  try{localStorage.setItem(key,JSON.stringify(next));setLocalError('');setMessage('Saved on this device')}catch{setLocalError('Device storage is unavailable or full. Export a backup before leaving this page.');setMessage('Not saved on this device')}
 }
 async function saveCloud(){
  if(cloud!=='ready')return
  const payload=structuredClone(dataRef.current),editing=edits.current;setCloud('saving')
  const query=revision.current
   ? supabase.from('member_schedule_planners').update({payload}).eq('user_id',userId).eq('updated_at',revision.current).select('updated_at').maybeSingle()
   : supabase.from('member_schedule_planners').insert({user_id:userId,payload}).select('updated_at').single()
  const {data:row,error}=await query
  setCloud('ready')
  if(error||!row){setMessage('Account save failed or another device has a newer copy. Export your work, then reload the account copy.');return}
  revision.current=row.updated_at;remote.current={payload,updated_at:row.updated_at};setMessage(editing===edits.current?'Saved to your account':'Account saved; newer edits are on this device only')
 }
 async function loadCloud(){
  const {data:row,error}=await supabase.from('member_schedule_planners').select('payload,updated_at').eq('user_id',userId).maybeSingle()
  if(error||!row){setMessage(error?'Could not load account copy. Device plans were kept.':'No account copy saved yet.');return}
  try{const next=parsePlanner(row.payload);revision.current=row.updated_at;remote.current={payload:next,updated_at:row.updated_at};update(next);setMessage('Account copy loaded and saved on this device')}catch{setMessage('Account copy is invalid. Device plans were kept.')}
 }
 return {data,update,cloud,message,localError,saveCloud,loadCloud}
}
