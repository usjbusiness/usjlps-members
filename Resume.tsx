import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { useHistory, useMe, useResume } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { blocks, downloadDocx, downloadPdf, emptyEdu, emptyJob, emptyProject, initialResume, lpsEntry, type Edu, type Job, type Resume } from '@/lib/resume'
import { ErrorBox, Icon, PageHead, Spinner, useToast } from '@/components/ui'

const VERBS = ['Led', 'Organized', 'Coordinated', 'Developed', 'Managed', 'Created', 'Analyzed', 'Improved', 'Increased', 'Presented', 'Negotiated', 'Designed', 'Launched', 'Trained', 'Supported', 'Researched']

function F({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return <label className={`rf${wide ? ' wide' : ''}`}><span>{label}{hint && <em>{hint}</em>}</span>{children}</label>
}
function Move({ i, n, move, remove }: { i: number; n: number; move: (from: number, to: number) => void; remove: () => void }) {
  return (
    <div className="rcard-tools">
      <button type="button" className="icon-btn sm" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up" title="Move up"><Icon name="up" size={15} /></button>
      <button type="button" className="icon-btn sm" disabled={i === n - 1} onClick={() => move(i, i + 1)} aria-label="Move down" title="Move down"><Icon name="down" size={15} /></button>
      <button type="button" className="icon-btn sm" onClick={remove} aria-label="Remove" title="Remove"><Icon name="trash" size={15} /></button>
    </div>
  )
}
function list<T>(items: T[], set: (v: T[]) => void) {
  return {
    patch: (i: number, p: Partial<T>) => set(items.map((x, j) => (j === i ? { ...x, ...p } : x))),
    move: (a: number, b: number) => { const c = [...items]; const [x] = c.splice(a, 1); c.splice(b, 0, x); set(c) },
    remove: (i: number) => set(items.filter((_, j) => j !== i)),
  }
}

function Jobs({ items, set, kind }: { items: Job[]; set: (v: Job[]) => void; kind: 'experience' | 'leadership' }) {
  const l = list(items, set)
  return <>{items.map((j, i) => (
    <div key={j.id} className="rcard">
      <Move i={i} n={items.length} move={l.move} remove={() => l.remove(i)} />
      <div className="rgrid">
        <F label={kind === 'experience' ? 'Employer' : 'Organization'}><input value={j.org} placeholder={kind === 'experience' ? 'e.g. Travelers' : 'e.g. USJ Student Government'} onChange={(e) => l.patch(i, { org: e.target.value })} /></F>
        <F label="City, State"><input value={j.location} placeholder="Hartford, CT" onChange={(e) => l.patch(i, { location: e.target.value })} /></F>
        <F label="Position title"><input value={j.title} placeholder={kind === 'experience' ? 'e.g. Finance Intern' : 'e.g. Treasurer'} onChange={(e) => l.patch(i, { title: e.target.value })} /></F>
        <div className="rgrid two"><F label="Start"><input value={j.start} placeholder="Jun 2026" onChange={(e) => l.patch(i, { start: e.target.value })} /></F><F label="End"><input value={j.end} placeholder="Present" onChange={(e) => l.patch(i, { end: e.target.value })} /></F></div>
        <F label="Bullet points" hint="One per line. Lead with a strong action verb: task, your action, the result." wide>
          <textarea rows={4} value={j.bullets} placeholder={'Analyzed monthly expense reports for 3 departments, finding $4K in savings\nPresented findings to the CFO and finance team'} onChange={(e) => l.patch(i, { bullets: e.target.value })} />
        </F>
      </div>
    </div>
  ))}</>
}

function EduList({ items, set }: { items: Edu[]; set: (v: Edu[]) => void }) {
  const l = list(items, set)
  return <>{items.map((e, i) => (
    <div key={e.id} className="rcard">
      <Move i={i} n={items.length} move={l.move} remove={() => l.remove(i)} />
      <div className="rgrid">
        <F label="School"><input value={e.school} placeholder="University of Saint Joseph" onChange={(x) => l.patch(i, { school: x.target.value })} /></F>
        <F label="City, State"><input value={e.location} placeholder="West Hartford, CT" onChange={(x) => l.patch(i, { location: x.target.value })} /></F>
        <F label="Degree"><input value={e.degree} placeholder="Bachelor of Science in Business Management" onChange={(x) => l.patch(i, { degree: x.target.value })} /></F>
        <F label="Graduation"><input value={e.date} placeholder="May 2029" onChange={(x) => l.patch(i, { date: x.target.value })} /></F>
        <F label="Extra lines" hint="Optional, one per line (italic): minor, athletics, honors college." wide><textarea rows={2} value={e.lines} placeholder="Minor in Accounting" onChange={(x) => l.patch(i, { lines: x.target.value })} /></F>
        <F label="Bullets" hint="Optional, one per line: GPA (3.0+), Dean's List, relevant coursework." wide><textarea rows={2} value={e.bullets} placeholder="GPA 3.8" onChange={(x) => l.patch(i, { bullets: x.target.value })} /></F>
      </div>
    </div>
  ))}</>
}

export function Paper({ r }: { r: Resume }) {
  const bs = useMemo(() => blocks(r), [r])
  const ref = useRef<HTMLDivElement>(null)
  const [long, setLong] = useState(false)
  useEffect(() => { const el = ref.current; if (el) setLong(el.scrollHeight > el.clientWidth * (11 / 8.5) * 2 + 2) }, [bs])
  return (
    <div className="paper-wrap">{long && <p className="paper-warn"><Icon name="clock" size={14} />Longer than two pages. Try shortening some bullets — one or two pages is best.</p>}<div className="paper" ref={ref}>
      {!bs.length && <p className="paper-empty">Your résumé preview appears here.</p>}
      {bs.map((b, i) => {
        const runs = (rs: { text: string; b?: boolean; i?: boolean }[]) => rs.map((x, j) => <span key={j} style={{ fontWeight: x.b ? 700 : 400, fontStyle: x.i ? 'italic' : 'normal' }}>{x.text}</span>)
        switch (b.t) {
          case 'name': return <h1 key={i}>{b.text}</h1>
          case 'contact': return <p key={i} className="pc">{b.text}</p>
          case 'heading': return <h2 key={i}>{b.text}</h2>
          case 'row': return <p key={i} className={`pr${b.gap ? ' gap' : ''}`}><span>{runs(b.left)}</span><span>{b.right}</span></p>
          case 'line': return <p key={i}>{runs(b.runs)}</p>
          case 'bullet': return <p key={i} className="pb">{runs(b.runs)}</p>
        }
      })}
    </div></div>
  )
}

export function ResumePage() {
  const me = useMe().data!
  const { session } = useAuth()
  const q = useResume(); const hist = useHistory()
  const qc = useQueryClient(); const toast = useToast()
  const [r, setR] = useState<Resume | null>(null)
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [state, setState] = useState<'' | 'saving' | 'saved'>('')
  const [busy, setBusy] = useState<'' | 'docx' | 'pdf'>('')
  const dirty = useRef(false)
  const attended = useMemo(() => [
    ...(hist.data?.meetings ?? []).filter((m) => m.status === 'present').map((m) => ({ title: m.title, headliner: m.headliner })),
    ...(hist.data?.awards ?? []).filter((a) => a.event).map((a) => ({ title: a.event!, headliner: a.value === 2 })),
  ], [hist.data])

  useEffect(() => {
    if (r || q.isLoading || hist.isLoading) return
    const saved = q.data?.data as Partial<Resume> | undefined
    const base = initialResume(me, session?.user.email ?? me.member?.email ?? me.board?.email ?? '', attended)
    setR(saved && Object.keys(saved).length ? { ...base, ...saved, skills: { ...base.skills, ...(saved.skills ?? {}) } } as Resume : base)
  }, [q.isLoading, hist.isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!r || !dirty.current || !session) return
    const t = window.setTimeout(async () => {
      setState('saving')
      const { error } = await supabase.from('member_resumes').upsert({ owner_id: session.user.id, data: r })
      if (error) { setState(''); toast.error(error); return }
      dirty.current = false; setState('saved'); qc.setQueryData(['resume'], { data: r, updated_at: new Date().toISOString() })
    }, 1200)
    return () => window.clearTimeout(t)
  }, [r]) // eslint-disable-line react-hooks/exhaustive-deps

  if (q.error) return <div className="page"><ErrorBox error={q.error} retry={() => q.refetch()} /></div>
  if (!r) return <div className="page"><Spinner /></div>
  const set = (p: Partial<Resume>) => { dirty.current = true; setState(''); setR({ ...r, ...p }) }
  const exp = async (kind: 'docx' | 'pdf') => {
    if (!r.name.trim()) { toast.error('Add your name first.'); return }
    setBusy(kind)
    try { await (kind === 'docx' ? downloadDocx(r) : downloadPdf(r)); toast.ok(kind === 'docx' ? 'Word file downloaded. Open it in Word to fine-tune.' : 'PDF downloaded.') }
    catch (e) { toast.error(e) } finally { setBusy('') }
  }
  const addLps = () => set({ leadership: [lpsEntry(me, attended), ...r.leadership.filter((j) => !/leadership & professional society/i.test(j.org))] })
  const hasLps = r.leadership.some((j) => /leadership & professional society/i.test(j.org))

  return (
    <div className={`page resume-page view-${view}`}>
      <PageHead eyebrow="Career" title="Résumé Builder" sub="Built on the USJ Career Center format. Fill in the fields, then download a Word file or a PDF. Your draft saves automatically."
        actions={<div className="resume-actions">
          <span className="note-state">{state === 'saving' ? 'Saving…' : state === 'saved' ? <><Icon name="check" size={13} />Saved</> : ''}</span>
          <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => exp('docx')}><Icon name="download" size={15} />{busy === 'docx' ? 'Preparing…' : 'Word'}</button>
          <button className="btn btn-gold btn-sm" disabled={!!busy} onClick={() => exp('pdf')}><Icon name="download" size={15} />{busy === 'pdf' ? 'Preparing…' : 'PDF'}</button>
        </div>} />
      <div className="seg resume-seg" role="tablist">
        <button className={view === 'edit' ? 'on' : ''} onClick={() => setView('edit')}>Edit</button>
        <button className={view === 'preview' ? 'on' : ''} onClick={() => setView('preview')}>Preview</button>
      </div>
      <div className="resume">
        <div className="resume-form">
          <section className="rsec">
            <h2>Contact</h2>
            <div className="rgrid">
              <F label="Full name"><input value={r.name} onChange={(e) => set({ name: e.target.value })} /></F>
              <F label="Phone"><input inputMode="tel" value={r.phone} placeholder="860-555-0123" onChange={(e) => set({ phone: e.target.value })} /></F>
              <F label="Email" hint="Use a professional address."><input inputMode="email" value={r.email} onChange={(e) => set({ email: e.target.value })} /></F>
              <F label="City, State"><input value={r.location} onChange={(e) => set({ location: e.target.value })} /></F>
              <F label="LinkedIn" wide><input value={r.linkedin} placeholder="linkedin.com/in/your-name" onChange={(e) => set({ linkedin: e.target.value })} /></F>
            </div>
          </section>

          <section className="rsec">
            <h2>Education</h2>
            <EduList items={r.education} set={(education) => set({ education })} />
            <button className="btn btn-ghost btn-sm" onClick={() => set({ education: [...r.education, emptyEdu()] })}><Icon name="plus" size={15} />Add school</button>
          </section>

          <section className="rsec">
            <h2>Experience</h2>
            <p className="rhint">List in reverse chronological order: most recent first. Jobs, internships, part-time work.</p>
            <Jobs kind="experience" items={r.experience} set={(experience) => set({ experience })} />
            <button className="btn btn-ghost btn-sm" onClick={() => set({ experience: [emptyJob(), ...r.experience] })}><Icon name="plus" size={15} />Add experience</button>
          </section>

          <section className="rsec">
            <h2>Projects <em className="opt-pill">Optional</em></h2>
            <p className="rhint">Academic or personal projects relevant to the job you want.</p>
            {r.projects.map((p, i) => {
              const l = list(r.projects, (projects) => set({ projects }))
              return (
                <div key={p.id} className="rcard">
                  <Move i={i} n={r.projects.length} move={l.move} remove={() => l.remove(i)} />
                  <div className="rgrid">
                    <F label="Project name" wide><input value={p.name} placeholder="Market Analysis of Hartford Startups" onChange={(e) => l.patch(i, { name: e.target.value })} /></F>
                    <F label="Description" wide><textarea rows={2} value={p.text} placeholder="Researched 20 local startups and presented growth recommendations to faculty" onChange={(e) => l.patch(i, { text: e.target.value })} /></F>
                  </div>
                </div>
              )
            })}
            <div className="rrow">
              <button className="btn btn-ghost btn-sm" onClick={() => set({ projects: [...r.projects, emptyProject()] })}><Icon name="plus" size={15} />Add project</button>
              {r.projects.length > 0 && <label className="rcheck"><input type="checkbox" checked={r.projectsFirst} onChange={(e) => set({ projectsFirst: e.target.checked })} />Show above Experience</label>}
            </div>
          </section>

          <section className="rsec">
            <h2>Leadership &amp; Community Involvement</h2>
            <p className="rhint">Student organizations, volunteering, campus engagement. Your LPS entry is written from your real record.</p>
            <Jobs kind="leadership" items={r.leadership} set={(leadership) => set({ leadership })} />
            <div className="rrow">
              <button className="btn btn-ghost btn-sm" onClick={() => set({ leadership: [...r.leadership, emptyJob()] })}><Icon name="plus" size={15} />Add organization</button>
              <button className="btn btn-ghost btn-sm" onClick={addLps}><Icon name="medal" size={15} />{hasLps ? 'Refresh my LPS entry' : 'Add my LPS involvement'}</button>
            </div>
          </section>

          <section className="rsec">
            <h2>Skills</h2>
            <div className="rgrid">
              <F label="Technical / Computer" hint="With level: Intermediate Excel, Basic SQL" wide><input value={r.skills.technical} onChange={(e) => set({ skills: { ...r.skills, technical: e.target.value } })} /></F>
              <F label="Languages" hint="Basic, Intermediate, Advanced, Fluent"><input value={r.skills.languages} placeholder="English (Fluent), Spanish (Intermediate)" onChange={(e) => set({ skills: { ...r.skills, languages: e.target.value } })} /></F>
              <F label="Certifications" hint="Optional"><input value={r.skills.certifications} onChange={(e) => set({ skills: { ...r.skills, certifications: e.target.value } })} /></F>
              <F label="Interests" hint="Optional" wide><input value={r.skills.interests} onChange={(e) => set({ skills: { ...r.skills, interests: e.target.value } })} /></F>
            </div>
          </section>

          <section className="rsec">
            <h2>Honors and Awards <em className="opt-pill">Optional</em></h2>
            <F label="One per line" hint="Just the name. With only 1–2, consider adding them under Education." wide><textarea rows={3} value={r.honors} placeholder={"Dean's List (Fall 2026)"} onChange={(e) => set({ honors: e.target.value })} /></F>
          </section>

          <section className="rsec rtips">
            <h2>Tips from the Career Center format</h2>
            <ul>
              <li>One or two pages. Most recent first in every section.</li>
              <li>Start each bullet with a strong action verb and show the result (numbers help).</li>
              <li>Download the Word file if you want to adjust spacing, then save as PDF to send.</li>
            </ul>
            <div className="verbs">{VERBS.map((v) => <span key={v}>{v}</span>)}</div>
          </section>
        </div>
        <div className="resume-preview"><Paper r={r} /></div>
      </div>
    </div>
  )
}
