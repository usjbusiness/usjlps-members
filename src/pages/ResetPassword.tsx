import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

/** Accept a recovery redirect containing a valid Supabase session; do not use an existing session. */
let recovery: Promise<string> | null = null
function redeem() {
 if (recovery) return recovery
 const hash = new URLSearchParams(location.hash.slice(1))
 const access = hash.get('access_token'); const refresh = hash.get('refresh_token'); const type = hash.get('type')
 history.replaceState(null, '', location.pathname)
 recovery = (async () => {
  if (type !== 'recovery' || !access || !refresh) throw new Error('This recovery link is missing or expired. Request a new link.')
  const { data, error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh })
  if (error || !data.user) throw new Error('This recovery link is invalid or expired. Request a new link.')
  return data.user.id
 })()
 return recovery
}
export function ResetPassword() {
 const [id,setId]=useState(''); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [error,setError]=useState(''); const [done,setDone]=useState(false);const [busy,setBusy]=useState(false)
 useEffect(()=>{void redeem().then(setId,e=>setError(e.message))},[])
 const save=async(e:FormEvent)=>{e.preventDefault();setError('');if(password.length<12){setError('Use at least 12 characters.');return}if(password!==confirm){setError('Passwords do not match.');return}setBusy(true);const current=await supabase.auth.getUser();if(current.data.user?.id!==id){setError('The recovery session changed. Request a new link.');setBusy(false);return}const {error:err}=await supabase.auth.updateUser({password});setBusy(false);if(err){setError(err.message);return}setPassword('');setConfirm('');setDone(true)}
 return <div className="login"><div className="login-card"><img className="login-mono" src="/img/mono-gold.webp" alt="LPS"/><h1>Reset password</h1>{done?<><p>Your password has been updated. If you use the same account for E-Board, it has changed there too.</p><Link className="btn btn-gold" to="/">Continue to portal</Link></>:<form onSubmit={save}><p className="login-sub">Choose a new password. Use at least 12 characters. If your E-Board account uses the same sign-in, its password will change too.</p><label className="fld"><span>New password</span><input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label><label className="fld"><span>Confirm password</span><input type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required /></label>{error&&<p className="form-err" role="alert">{error}</p>}<button className="btn btn-gold btn-block" disabled={!id||busy}>{busy?'Saving…':'Update password'}</button><Link className="link" to="/">Return to sign in</Link></form>}</div></div>
}
