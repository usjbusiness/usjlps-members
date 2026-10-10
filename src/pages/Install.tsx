import { useEffect, useState } from 'react'
import { Icon, PageHead } from '@/components/ui'

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: Prompt | null = null
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as Prompt })

const ua = navigator.userAgent
const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isAndroid = /android/i.test(ua)
export const isInstalled = () => matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

const Key = ({ children }: { children: React.ReactNode }) => <span className="kbd">{children}</span>

export function Install() {
  const [tab, setTab] = useState<'ios' | 'android' | 'desktop'>(isIOS ? 'ios' : isAndroid ? 'android' : 'desktop')
  const [canPrompt, setCanPrompt] = useState(!!deferred)
  const [done, setDone] = useState(isInstalled())
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); deferred = e as Prompt; setCanPrompt(true) }
    const inst = () => setDone(true)
    window.addEventListener('beforeinstallprompt', on); window.addEventListener('appinstalled', inst)
    return () => { window.removeEventListener('beforeinstallprompt', on); window.removeEventListener('appinstalled', inst) }
  }, [])
  const install = async () => { if (!deferred) return; await deferred.prompt(); const c = await deferred.userChoice; if (c.outcome === 'accepted') setDone(true); deferred = null; setCanPrompt(false) }

  return (
    <div className="page">
      <PageHead eyebrow="Your membership, in your pocket" title="Get the App" sub="Add the LPS portal to your home screen. It opens full screen like a real app, keeps you signed in and takes 20 seconds. No App Store needed." />
      {done ? <div className="installed"><Icon name="check" size={20} /><span><strong>The LPS app is installed on this device.</strong> Open it from your home screen any time.</span></div>
        : canPrompt && <div className="installed is-cta"><img src="/icons/icon-192.png" alt="" /><span><strong>Install LPS on this device</strong><small>One tap, free, no App Store.</small></span><button className="btn btn-gold" onClick={install}><Icon name="download" size={16} />Install</button></div>}
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === 'ios'} className={tab === 'ios' ? 'on' : ''} onClick={() => setTab('ios')}>iPhone</button>
        <button role="tab" aria-selected={tab === 'android'} className={tab === 'android' ? 'on' : ''} onClick={() => setTab('android')}>Android</button>
        <button role="tab" aria-selected={tab === 'desktop'} className={tab === 'desktop' ? 'on' : ''} onClick={() => setTab('desktop')}>Laptop</button>
      </div>
      {tab === 'ios' && (
        <ol className="isteps">
          <li><b>1</b><div><strong>Open this page in Safari</strong><p>Go to <Key>members.usjlps.org</Key> in <b>Safari</b> and sign in. (Chrome on iPhone works too on iOS 16.4 and newer.)</p></div></li>
          <li><b>2</b><div><strong>Tap the Share button</strong><p>It is the square with an arrow <span className="glyph"><Icon name="share" size={18} /></span> at the bottom of the screen (on iPad, at the top). On iOS 26, tap <span className="glyph"><Icon name="dots" size={16} /></span> first, then <b>Share</b>.</p></div></li>
          <li><b>3</b><div><strong>Choose “Add to Home Screen”</strong><p>Scroll down the list and tap <span className="glyph"><Icon name="addsq" size={18} /></span> <b>Add to Home Screen</b>. Keep <b>Open as Web App</b> switched on.</p></div></li>
          <li><b>4</b><div><strong>Tap “Add”</strong><p>The gold <b>LPS</b> icon appears on your home screen. Open it and sign in once with your email code.</p></div></li>
        </ol>
      )}
      {tab === 'android' && (
        <ol className="isteps">
          <li><b>1</b><div><strong>Open this page in Chrome</strong><p>Go to <Key>members.usjlps.org</Key> in <b>Chrome</b> and sign in.</p></div></li>
          <li><b>2</b><div><strong>Tap “Install” or the menu</strong><p>If a bar says <b>Install app</b>, tap it. Otherwise tap the menu <span className="glyph"><Icon name="dots" size={16} /></span> in the top-right corner.</p></div></li>
          <li><b>3</b><div><strong>Choose “Install app” or “Add to Home screen”</strong><p>Then tap <b>Install</b> to confirm. Samsung Internet: menu <span className="glyph"><Icon name="more" size={16} /></span> → <b>Add page to</b> → <b>Home screen</b>.</p></div></li>
          <li><b>4</b><div><strong>Open LPS from your apps</strong><p>The gold <b>LPS</b> icon is on your home screen and in the app drawer.</p></div></li>
        </ol>
      )}
      {tab === 'desktop' && (
        <ol className="isteps">
          <li><b>1</b><div><strong>Open this page in Chrome or Edge</strong><p>Go to <Key>members.usjlps.org</Key> and sign in.</p></div></li>
          <li><b>2</b><div><strong>Click the install icon</strong><p>At the right end of the address bar, click the screen icon with an arrow <span className="glyph"><Icon name="download" size={16} /></span>, or open the menu <span className="glyph"><Icon name="dots" size={16} /></span> → <b>Cast, save and share</b> → <b>Install page as app</b>.</p></div></li>
          <li><b>3</b><div><strong>Click “Install”</strong><p>LPS opens in its own window and gets a Dock / taskbar icon. On a Mac with Safari: <b>File</b> → <b>Add to Dock</b>.</p></div></li>
        </ol>
      )}
      <section className="faq">
        <details><summary>Do I have to sign in every time?</summary><p>No. Sign in once with the code from your email and keep “Keep me signed in” checked. You stay signed in on that device.</p></details>
        <details><summary>Is it a real app? Does it take space?</summary><p>It is a web app: it opens full screen with its own icon, but it does not go through the App Store and uses almost no storage. Updates arrive automatically.</p></details>
        <details><summary>I do not see “Add to Home Screen”.</summary><p>Make sure you are in Safari (iPhone) or Chrome (Android), not inside Instagram, GroupMe or Outlook. In those apps tap the menu and choose <b>Open in browser</b> first.</p></details>
      </section>
    </div>
  )
}
