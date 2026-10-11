import { StrictMode, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import './styles.css'
import { AuthProvider, useAuth } from '@/lib/auth'
import { useMe } from '@/lib/api'
import { ErrorBox, ToastProvider } from '@/components/ui'
import { Shell } from '@/components/Shell'
import { Login } from '@/pages/Login'
import { Home } from '@/pages/Home'
import { News } from '@/pages/News'
import { Events } from '@/pages/Events'
import { Watch } from '@/pages/Watch'
import { People } from '@/pages/People'
import { PersonPage } from '@/pages/Person'
import { RankPage } from '@/pages/Rank'
import { ApparelPage } from '@/pages/Apparel'
import { Propose } from '@/pages/Propose'
import { Install } from '@/pages/Install'
import { Profile } from '@/pages/Profile'
import { NotesPage } from '@/pages/Notes'
import { RecordPage } from '@/pages/Record'
import { ResumePage } from '@/pages/Resume'
import { PublicPage } from '@/pages/Public'
import { CertificatePage } from '@/pages/Certificate'
import { VerifyPage } from '@/pages/Verify'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } } })

function Splash() {
  return <div className="splash"><img src="/img/mono-gold.webp" alt="" /><span className="splash-bar"><i /></span></div>
}

/** Signed in AND an active member (or e-board). Anyone else is signed out with a clear message. */
function Gate({ children }: { children: ReactNode }) {
  const { status, signOut } = useAuth()
  const me = useMe(status === 'signed-in')
  useEffect(() => {
    if (status === 'signed-in' && me.isSuccess && !me.data) signOut('This email does not have an active LPS membership right now. If you think this is a mistake, contact the e-board.')
  }, [status, me.isSuccess, me.data, signOut])
  if (status === 'loading') return <Splash />
  if (status === 'signed-out') return <Login />
  if (me.isLoading || (me.isSuccess && !me.data)) return <Splash />
  if (me.error) return <div className="center-page"><ErrorBox error={me.error} retry={() => me.refetch()} /><button className="link" onClick={() => signOut()}>Sign out</button></div>
  return <>{children}</>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="u/:slug" element={<PublicPage />} />
              <Route path="verify" element={<VerifyPage />} />
              <Route path="verify/:no" element={<VerifyPage />} />
              <Route path="*" element={
                <Gate>
                  <Routes>
                    <Route element={<Shell />}>
                      <Route index element={<Home />} />
                      <Route path="watch" element={<Watch />} />
                      <Route path="news" element={<News />} />
                      <Route path="events" element={<Events />} />
                      <Route path="notes" element={<NotesPage />} />
                      <Route path="record" element={<RecordPage />} />
                      <Route path="resume" element={<ResumePage />} />
                      <Route path="people" element={<People />} />
                      <Route path="people/:key" element={<PersonPage />} />
                      <Route path="rank" element={<RankPage />} />
                      <Route path="certificate" element={<CertificatePage />} />
                      <Route path="apparel" element={<ApparelPage />} />
                      <Route path="propose" element={<Propose />} />
                      <Route path="install" element={<Install />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="login" element={<Navigate to="/" replace />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </Gate>
              } />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => undefined) })
}
