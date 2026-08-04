import { Component, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import TopProgressBar from './components/TopProgressBar';
import useGlowBorder from './hooks/useGlowBorder';
import useCredentialsStore from './store/credentialsStore';
import { IS_SELF_HOSTED } from './config/selfHost';
const Landing      = lazy(() => import('./pages/Landing'));
const LandingV2    = lazy(() => import('./pages/Landing/LandingV2'));
const Auth         = lazy(() => import('./pages/auth'));
const VerifyEmail  = lazy(() => import('./pages/auth/VerifyEmail'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Workspace    = lazy(() => import('./pages/Workspace'));
const Privacy      = lazy(() => import('./pages/Privacy'));
const Terms        = lazy(() => import('./pages/Terms'));
const ChatPage     = lazy(() => import('./pages/Chat/ChatPage'));
const Product      = lazy(() => import('./pages/Product'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Docs         = lazy(() => import('./pages/Docs'));
const Upgrade      = lazy(() => import('./pages/Upgrade'));
const ApiPage      = lazy(() => import('./pages/marketing/ApiPage'));
const SelfHosting  = lazy(() => import('./pages/marketing/SelfHosting'));
const Status       = lazy(() => import('./pages/marketing/Status'));
const Security     = lazy(() => import('./pages/marketing/Security'));

const PageLoader = () => (
  <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 32, height: 32, border: '2px solid #27272a', borderTop: '2px solid #a1a1aa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#080808', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0', padding: '40px', position: 'fixed', inset: 0, zIndex: 9999 }}>
          <div style={{ textAlign: 'center', maxWidth: '360px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '22px' }}>⚡</div>
            <div style={{ color: '#fff', fontSize: '17px', fontWeight: 700, marginBottom: '10px', fontFamily: 'system-ui, sans-serif' }}>Something went wrong</div>
            <div style={{ color: '#555', fontSize: '13px', lineHeight: '1.6', fontFamily: 'system-ui, sans-serif', marginBottom: '28px' }}>An unexpected error occurred. Our team has been notified. Try reloading — it usually fixes it.</div>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '9px 22px', background: '#fff', border: 'none', borderRadius: '8px', color: '#000', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem('blinkbox_token');
  // Credentials arrive over the socket — a finished OAuth popup, a teammate
  // adding one. Subscribe at the door rather than when a picker happens to
  // mount, so an event that lands while the user is still navigating isn't lost.
  useEffect(() => { if (token) useCredentialsStore.getState().wireLive(); }, [token]);
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RequireGuest = ({ children }) => {
  const token = localStorage.getItem('blinkbox_token');
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  useGlowBorder();
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <TopProgressBar />
        <Toaster theme="dark" position="top-center" richColors expand={false} closeButton duration={5000} />
<Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                IS_SELF_HOSTED
                  ? <Navigate to="/login" replace />
                  : <RequireGuest><LandingV2 /></RequireGuest>
              }
            />
            <Route path="/login" element={<RequireGuest><Auth /></RequireGuest>} />
            <Route path="/reset-password" element={<Auth />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/workspace/:id" element={<RequireAuth><Workspace /></RequireAuth>} />
            <Route path="/chat" element={<RequireAuth><ChatPage /></RequireAuth>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/policy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/product" element={<Product />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/upgrade" element={<RequireAuth><Upgrade /></RequireAuth>} />
            <Route path="/api" element={<ApiPage />} />
            <Route path="/self-hosting" element={<SelfHosting />} />
            <Route path="/status" element={<Status />} />
            <Route path="/security" element={<Security />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}