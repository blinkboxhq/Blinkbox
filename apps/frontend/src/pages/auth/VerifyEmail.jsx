import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import api from '../../lib/api';
import logo from '../../assets/logo.svg';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token found in the link.');
      return;
    }

    api.post('/api/auth/verify-email', { token })
      .then(res => {
        localStorage.setItem('blinkbox_token', res.data.token);
        localStorage.setItem('blinkbox_user', JSON.stringify(res.data.user));
        setStatus('success');
        setTimeout(() => navigate('/dashboard'), 2000);
      })
      .catch(err => {
        setStatus('error');
        setErrorMsg(err.response?.data?.message || 'Verification failed. The link may have expired.');
      });
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <Link to="/" className="flex items-center gap-2.5 mb-12">
        <img src={logo} alt="BlinkBox" className="w-7 h-7 object-contain" />
        <span className="text-sm font-bold tracking-[0.05em] text-white">Blinkbox</span>
      </Link>

      <div className="w-full max-w-[360px] bg-neutral-950 border border-neutral-900 rounded-2xl p-8 flex flex-col items-center text-center"
        style={{ animation: 'scaleIn 0.25s ease-out' }}>

        <style>{`
          @keyframes scaleIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
          @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        `}</style>

        {status === 'loading' && (
          <div className="flex flex-col items-center gap-4 py-4" style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <div className="w-14 h-14 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
            </div>
            <p className="text-[15px] font-semibold text-white">Verifying your email…</p>
            <p className="text-[12px] text-neutral-500">Just a moment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4" style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-white mb-1">Email verified!</p>
              <p className="text-[12px] text-neutral-500">Redirecting to your workspace…</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-4 py-2" style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-white mb-1.5">Link expired</p>
              <p className="text-[12px] text-neutral-500 leading-relaxed">{errorMsg}</p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              <Link
                to="/login"
                className="w-full py-2.5 rounded-lg bg-white text-black text-[13px] font-semibold hover:bg-neutral-100 transition-colors text-center"
              >
                Back to sign in
              </Link>
              <p className="text-[11px] text-neutral-700">
                Need a new link?{' '}
                <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
                  Sign in to resend
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 text-[11px] text-neutral-800">
        <Mail className="w-3.5 h-3.5" />
        <span>Check your spam folder if you don't see the email</span>
      </div>
    </div>
  );
}
