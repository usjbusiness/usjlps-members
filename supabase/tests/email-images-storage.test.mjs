import { PGlite } from '@electric-sql/pglite'
import { citext } from '@electric-sql/pglite/contrib/citext'
import fs from 'node:fs'
import assert from 'node:assert/strict'
const db=new PGlite({extensions:{citext}})
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner uuid);
alter table storage.objects enable row level security;grant all on storage.objects to authenticated;
grant usage on schema public,storage to anon,authenticated;alter default privileges in schema public grant all on tables to anon,authenticated;alter default privileges in schema public grant all on sequences to anon,authenticated;`)
const dir=new URL('../migrations/',import.meta.url).pathname
for(const f of fs.readdirSync(dir).sort().filter(f=>!f.includes('backfill')))await db.exec(fs.readFileSync(dir+f,'utf8'))
// Safe to run this additive migration again.
await db.exec(fs.readFileSync(dir+'20261030000200_announcement_email_images.sql','utf8'))
const roles=['president','vice_president','faculty_advisor','secretary','major_lead']
const ids=Object.fromEntries(roles.map((r,i)=>[r,`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`]))
for(const role of roles){await db.query('insert into auth.users(id,email) values($1,$2)',[ids[role],role+'@example.invalid']);await db.query('insert into public.profiles(auth_user_id,full_name,email,role,position_title) values($1,$2,$3,$4,$2)',[ids[role],role,role+'@example.invalid',role])}
async function as(role,sql,params=[]){await db.exec(`reset role;set role ${role==='anon'?'anon':'authenticated'};select set_config('request.jwt.claim.sub','${ids[role]??''}',false)`);try{return await db.query(sql,params)}finally{await db.exec('reset role')}}
let n=0
async function check(name,fn){await fn();n++;console.log('PASS '+name)}
const imgid='20000000-0000-4000-8000-000000000001',image={id:imgid,path:ids.president+'/'+imgid+'.png',alt:'Guest poster',width:512}
for(const role of roles.slice(0,3))await check(role+' can upload to own folder',()=>as(role,'insert into storage.objects(bucket_id,name) values($1,$2)',['announcement-images',ids[role]+'/'+imgid+'.png']))
for(const role of ['secretary','major_lead','anon'])await check(role+' cannot upload',()=>assert.rejects(()=>as(role,'insert into storage.objects(bucket_id,name) values($1,$2)',['announcement-images',(ids[role]??ids.president)+'/'+imgid+'.png'])))
await check('cross-user upload denied',()=>assert.rejects(()=>as('president','insert into storage.objects(bucket_id,name) values($1,$2)',['announcement-images',ids.vice_president+'/'+imgid+'.png'])))
await check('SVG and traversal paths denied',async()=>{for(const name of [ids.president+'/'+imgid+'.svg',ids.president+'/../image.png'])await assert.rejects(()=>as('president','insert into storage.objects(bucket_id,name) values($1,$2)',['announcement-images',name]))})
await check('assets cannot be overwritten or deleted by client',async()=>{assert.equal((await as('president',"update storage.objects set name='other' where bucket_id='announcement-images' returning id")).rows.length,0);assert.equal((await as('president',"delete from storage.objects where bucket_id='announcement-images' returning id")).rows.length,0)})
let aid
await check('image metadata saves with announcement',async()=>{aid=(await as('president','insert into public.announcements(title,body,email_images) values($1,$2,$3::jsonb) returning id',['Hello','Message [[image:'+imgid+']]',JSON.stringify([image])])).rows[0].id;assert.equal((await as('president','select email_images from public.announcements where id=$1',[aid])).rows[0].email_images[0].width,512)})
await check('invalid metadata rejected at database boundary',async()=>{for(const v of [null,{},[{...image,path:'https://evil.invalid/logo.png'}],[{...image,alt:null}],[{...image,width:999}],[image,image],Array(7).fill(image)])await assert.rejects(()=>as('president','update public.announcements set email_images=$1::jsonb where id=$2',[JSON.stringify(v),aid]))})
await check('text-only announcements default to empty image list',async()=>{const row=(await as('president',"insert into public.announcements(title,body) values('Text only','Unchanged') returning email_images")).rows[0];assert.deepEqual(row.email_images,[])})
await check('bucket restricts size and MIME types',async()=>{const b=(await db.query("select * from storage.buckets where id='announcement-images'")).rows[0];assert.equal(b.file_size_limit,1048576);assert.equal(b.public,true);assert.deepEqual(b.allowed_mime_types,['image/png','image/jpeg'])})
await check('inactive author cannot upload',async()=>{await db.exec("select set_config('request.jwt.claim.sub','',false);update public.profiles set is_active=false where role='president'");await assert.rejects(()=>as('president','insert into storage.objects(bucket_id,name) values($1,$2)',['announcement-images',ids.president+'/'+imgid+'.jpg']))})
console.log(`${n} image storage/schema checks passed`)
await db.close()
