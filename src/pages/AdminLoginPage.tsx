import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { adminAuthApi } from '../api/services/adminAuth';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ROUTES } from '../constants/routes';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await adminAuthApi.login({ email: email.trim(), password });

    if (!result.ok) {
      setLoading(false);
      setError(
        result.error.code === 'NETWORK_ERROR'
          ? 'No internet connection. Please check your network.'
          : result.error.code === 'UNAUTHORIZED' || result.error.message?.toLowerCase().includes('invalid')
            ? 'Invalid email or password.'
            : result.error.message || 'Login failed. Please try again.'
      );
      return;
    }

    const authData = result.data;
    const profileResult = await adminAuthApi.me(authData.accessToken);

    if (!profileResult.ok) {
      setLoading(false);
      setError('Login succeeded but could not load profile. Please try again.');
      return;
    }

    login(authData.accessToken, profileResult.data);
    navigate(ROUTES.ADMIN, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#080C18] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin Access</h1>
          <p className="text-sm text-slate-500 mt-1">QualScore internal dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@qualscore.in"
                required
                disabled={loading}
                className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.10] rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                className="w-full pl-9 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.10] rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition"
                tabIndex={-1}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-sm font-semibold text-white transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-700 mt-6">
          Internal use only · Unauthorised access is prohibited
        </p>
      </div>
    </div>
  );
}
