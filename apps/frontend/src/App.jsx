import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Landing from './pages/Landing';
import Auth from './pages/auth';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';

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
        <div style={{ background: '#0a0a0c', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '40px' }}>
          <div style={{ color: '#ef4444', fontSize: '14px', fontFamily: 'monospace', maxWidth: '600px', textAlign: 'center' }}>
            <div style={{ color: '#e5e5e5', fontSize: '20px', marginBottom: '12px' }}>Something went wrong</div>
            <div style={{ color: '#71717a', fontSize: '12px', wordBreak: 'break-all' }}>{this.state.error?.message}</div>
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
        <Routes>
          <Route path="/" element={<RequireGuest><Landing /></RequireGuest>} />
          <Route path="/login" element={<RequireGuest><Auth /></RequireGuest>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/workspace/:id" element={<RequireAuth><Workspace /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}