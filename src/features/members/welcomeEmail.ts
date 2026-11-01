// Welcome letter for new General Body members.
// NOTE: the same builder is copied into supabase/functions/welcome-email/index.ts
// (Edge Functions are deployed as one file). Keep both in sync.
// Deliberately contains NO links or buttons so campus filters (Barracuda) let it through.

import { emailBodyHtml, emailBodyText, type EmailImage } from '@/lib/emailImages'

export const WELCOME_KEY = 'member_welcome'

// Used until the default text is saved in the portal (email_templates table).
export const DEFAULT_SUBJECT = 'Welcome to the USJ Leadership & Professional Society, {first_name}!'
export const DEFAULT_BODY = `On behalf of the entire Executive Board, welcome to the USJ Leadership & Professional Society (LPS)! We are truly excited to have you as part of our community.

LPS brings together students of every major to build the skills, network and leadership every career needs. Throughout the semester we host simulations, workshops, Headliner evenings with leaders from well-known organizations and networking nights.

Your LPS Member Portal is ready. To open it, go to our website usjlps.org, click "Member Portal" and sign in with your USJ email. Here is what you will find there:
•  Résumé Builder — create a professional résumé in the USJ Career Center format and download it
•  My Page — your own professional profile, like LinkedIn, that you can share anywhere with a link or QR code
•  Points & Ranks — earn stickers at our events and move up from Member to Bronze, Silver, Gold and Ivy
•  LPS Certificate — an official certificate you can add to LinkedIn and that employers can verify
•  Live — join polls, Q&A and slides from your phone during our meetings
•  Library — materials and slides from our sessions
•  Members — connect with other LPS members
•  Get the App — add the portal to your phone's home screen

The first time you sign in, a short tour will show you around.

If you have any questions or ideas, simply reply to this email — I would be happy to hear from you.

We look forward to seeing you at our next meeting!`

export interface WelcomeParts {
  emailImages?: EmailImage[]
  imageSrc?: (image: EmailImage) => string
  firstName: string
  subject: string
  body: string
  senderName: string
  senderPosition: string
  photoSrc?: string | null // cid:sender in the real email
  logoSrc?: string | null // cid:logo in the real email
  title?: string | null // member emails: headline shown above the greeting
  eyebrow?: string | null // small gold line under the club name (default: WELCOME TO THE SOCIETY)
  footer?: string | null // why the member receives the email
}

export const firstNameOf = (full: string) => (full.trim().split(/\s+/)[0] || 'there')
export const fillName = (s: string, first: string) => s.replace(/\{\s*first_name\s*\}/gi, first)

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()

export function welcomeHtml(p: WelcomeParts) {
  const body = emailBodyHtml(fillName(p.body, p.firstName), p.emailImages, p.imageSrc ?? (i => `cid:announcement-${i.id}`))
  const photo = p.photoSrc
    ? `<img src="${p.photoSrc}" width="72" height="72" alt="${esc(p.senderName)}" style="display:block;width:72px;height:72px;border-radius:50%;border:3px solid #C9A54C;object-fit:cover;">`
    : `<div style="width:72px;height:72px;border-radius:50%;background:#0b2a5b;border:3px solid #C9A54C;color:#ffffff;font-family:Georgia,serif;font-size:26px;line-height:72px;text-align:center;">${esc(initials(p.senderName))}</div>`
  const logo = p.logoSrc ? `<img src="${p.logoSrc}" width="76" height="76" alt="USJ Leadership & Professional Society" style="display:block;border:0;width:76px;height:76px;border-radius:50%;margin:0 auto 14px;">` : ''
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(fillName(p.subject, p.firstName))}</title><style>@media screen and (max-width:480px){.email-content{padding-left:20px!important;padding-right:20px!important}.email-brand{font-size:19px!important;letter-spacing:2px!important;overflow-wrap:anywhere!important}}</style></head>
<body style="margin:0;padding:0;background:#f4f2ec;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f2ec;"><tr><td align="center" style="padding:32px 12px;">
<table class="email-frame" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;table-layout:fixed;overflow-wrap:anywhere;background:#ffffff;border:1px solid #e3dfd5;">
<tr><td align="center" style="background:#0b0b0b;padding:30px 24px 26px;border-bottom:4px solid #C9A54C;">
  ${logo}
  <div class="email-brand" style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:4px;color:#ffffff;">USJ LEADERSHIP & PROFESSIONAL SOCIETY</div>
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#C9A54C;margin-top:7px;">${esc(p.eyebrow || 'WELCOME TO THE SOCIETY')}</div>
</td></tr>
<tr><td class="email-content" style="padding:38px 44px 6px;font-family:Arial,Helvetica,sans-serif;color:#1d1d1d;">
  ${p.title
    ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.3;color:#0b0b0b;margin:0 0 20px;">${esc(fillName(p.title, p.firstName))}</div><p style="margin:0 0 16px;font-size:16px;line-height:1.65;">Dear ${esc(p.firstName)},</p>`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.3;color:#0b0b0b;margin:0 0 22px;">Dear ${esc(p.firstName)},</div>`}
  ${body}
</td></tr>
<tr><td class="email-content" style="padding:6px 44px 34px;font-family:Arial,Helvetica,sans-serif;color:#1d1d1d;">
  <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">Warm regards,</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="middle" style="padding-right:16px;">${photo}</td>
    <td valign="middle" style="border-left:3px solid #C9A54C;padding-left:14px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#0b0b0b;">${esc(p.senderName)}</div>
      <div style="font-size:13px;color:#6f6c66;margin-top:3px;">${esc(p.senderPosition)}</div>
      <div style="font-size:13px;color:#6f6c66;">USJ Leadership & Professional Society &middot; University of Saint Joseph</div>
    </td>
  </tr></table>
</td></tr>
<tr><td align="center" style="background:#0b0b0b;padding:18px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;letter-spacing:1px;color:#a9a59c;">
  USJ Leadership & Professional Society &middot; University of Saint Joseph<br>${esc(p.footer || 'You are receiving this letter because you joined the USJ Leadership & Professional Society.')}
</td></tr>
</table></td></tr></table></body></html>`
}

export function welcomeText(p: WelcomeParts) {
  return `${p.title ? `${fillName(p.title, p.firstName)}\n\n` : ''}Dear ${p.firstName},\n\n${emailBodyText(fillName(p.body, p.firstName), p.emailImages).trim()}\n\nWarm regards,\n${p.senderName}\n${p.senderPosition}\nUSJ Leadership & Professional Society · University of Saint Joseph`
}
