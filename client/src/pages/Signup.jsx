import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.password) {
      return setError('Please fill in all fields');
    }
    if (formData.username.length < 3) {
      return setError('Username must be at least 3 characters');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    setLoading(true);
    setError('');
    try {
      await signup(formData.username, formData.email, formData.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different username/email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 relative">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-heading font-extrabold text-white tracking-tight">
            Create Account
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Get started with DevTrackr to analyze your repositories with AI
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900/50 text-red-300 text-sm px-4 py-3 rounded-xl mb-6 flex items-start gap-2.5">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="octocat"
              className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-500 px-4 py-3 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-sans text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="developer@company.com"
              className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-500 px-4 py-3 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-sans text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-500 px-4 py-3 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-sans text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-lg shadow-sky-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none mt-2"
          >
            {loading ? 'Creating Account...' : 'Get Started'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-slate-400 text-xs">
            Already have an account?{' '}
            <Link to="/login" className="text-sky-400 hover:underline font-semibold ml-0.5">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
