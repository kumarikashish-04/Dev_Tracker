import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass-panel border-b border-gray-800/80 px-6 py-4 sticky top-0 z-50 no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 transition-transform duration-300 group-hover:scale-105">
            <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <div>
            <span className="font-heading font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-400 bg-clip-text text-transparent">
              DevTrackr
            </span>
            <span className="block text-[10px] text-sky-400 font-semibold tracking-widest uppercase -mt-0.5">
              AI Insights
            </span>
          </div>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-800/50"
              >
                Dashboard
              </Link>
              <Link 
                to="/settings" 
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-800/50"
              >
                GitHub Connection
              </Link>

              {/* User Dropdown/Profile Info */}
              <div className="h-px w-6 bg-slate-800 rotate-90 hidden sm:block"></div>
              
              <div className="flex items-center gap-3 pl-2">
                <div className="hidden md:block text-right">
                  <div className="text-sm font-semibold text-slate-200">{user.username}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {user.githubToken ? '✓ GitHub Connected' : '✕ No Token'}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-slate-800 hover:bg-red-950/40 hover:text-red-400 border border-slate-700/60 hover:border-red-900/60 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg transition-all"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link 
                to="/login" 
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-sm font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-sky-500/20 hover:scale-[1.02]"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
