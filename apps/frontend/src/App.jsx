import { Component, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import FeedbackWidget from './components/FeedbackWidget';

const Landing   = lazy(() => import('./pages/Landing'));
const Auth      = lazy(() => import('./pages/auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Workspace = lazy(() => import('./pages/Workspace'));

const PageLoader = () => (
  <div style={{ background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 32, height: 32, border: '2px solid #27272a', borderTop: '2px solid #a1a1aa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#0a0a0c', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '40px', position: 'fixed', inset: 0, zIndex: 9999 }}>
          <div style={{ color: '#ef4444', fontSize: '14px', fontFamily: 'monospace', maxWidth: '600px', textAlign: 'center', border: '1px solid #ef444440', borderRadius: '12px', padding: '32px', background: '#1a0a0a' }}>
            <div style={{ color: '#ef4444', fontSize: '22px', marginBottom: '12px', fontWeight: 700 }}>Something went wrong</div>
            <div style={{ color: '#a1a1aa', fontSize: '13px', wordBreak: 'break-all', marginBottom: '8px' }}>{this.state.error?.message}</div>
            <button onClick={() => window.location.reload()} style={{ marginTop: '24px', padding: '10px 24px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#e5e5e5', cursor: 'pointer', fontSize: '13px' }}>
              Reload
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
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RequireGuest = ({ children }) => {
  const token = localStorage.getItem('blinkbox_token');
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster theme="dark" position="bottom-right" richColors />
        <FeedbackWidget />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<RequireGuest><Landing /></RequireGuest>} />
            <Route path="/login" element={<RequireGuest><Auth /></RequireGuest>} />
            <Route path="/reset-password" element={<Auth />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/workspace/:id" element={<RequireAuth><Workspace /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}