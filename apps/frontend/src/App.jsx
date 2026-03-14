import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Landing from './pages/Landing';
import Auth from './pages/auth';
import Dashboard from './pages/Dashboard'; 

// 👈 1. IMPORT YOUR NEW WORKSPACE HERE
import Workspace from './pages/Workspace'; 

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
    <BrowserRouter>
      <Toaster theme="dark" position="bottom-right" richColors />
      <Routes>
        <Route path="/" element={<RequireGuest><Landing /></RequireGuest>} />
        <Route path="/login" element={<RequireGuest><Auth /></RequireGuest>} />
        
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        
        {/* 👈 2. ADD THIS EXACT ROUTE SO THE DASHBOARD CAN FIND IT */}
        <Route path="/workspace/:id" element={<RequireAuth><Workspace /></RequireAuth>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}