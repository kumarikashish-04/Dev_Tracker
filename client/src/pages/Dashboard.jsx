import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../api/api';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ownerParam = searchParams.get('owner');
  const repoParam = searchParams.get('repo');

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);

  // Fetch list of repositories if no repo is selected
  const fetchReposList = useCallback(async () => {
    try {
      setReposLoading(true);
      const data = await api.get('/analytics/repos');
      setRepos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReposLoading(false);
    }
  }, []);

  // Fetch repository analysis details
  const fetchAnalysis = useCallback(async (ownerName, repoName) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get(`/analytics/repo/${ownerName}/${repoName}`);
      setAnalysis(data);
    } catch (err) {
      setError(err.message || 'Failed to load analysis.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (ownerParam && repoParam) {
        await fetchAnalysis(ownerParam, repoParam);
      } else {
        await fetchReposList();
      }
    };

    loadData();
  }, [ownerParam, repoParam, fetchAnalysis, fetchReposList]);

  const handleSyncNow = async () => {
    if (!analysis) return;
    setSyncing(true);
    try {
      const data = await api.post('/analytics/sync', { 
        owner: analysis.repoOwner, 
        repo: analysis.repoName 
      });
      setAnalysis(data);
    } catch (err) {
      alert('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Handle browser printing for PDF download
  const handlePrint = () => {
    window.print();
  };

  // 1. Selector view (if no parameters specified)
  if (!ownerParam || !repoParam) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 flex-1 w-full space-y-8 flex flex-col justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex h-16 w-16 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-2xl items-center justify-center shadow-lg shadow-sky-500/25 mb-4 animate-float">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"></path>
            </svg>
          </div>
          <h1 className="text-4xl font-heading font-extrabold text-white tracking-tight">
            Developer Productivity Hub
          </h1>
          <p className="text-slate-400 max-w-lg mx-auto text-base">
            Select a connected repository below to open the insights dashboard, or configure a new connection.
          </p>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-800/80 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-heading font-bold text-lg">Select Repository</span>
            <Link to="/settings" className="text-sky-400 hover:text-sky-300 text-xs font-bold transition-all">
              + Connect New Repo
            </Link>
          </div>

          {reposLoading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mx-auto mb-2"></div>
              <span className="text-xs">Loading sync records...</span>
            </div>
          ) : repos.length === 0 ? (
            <div className="py-8 text-center text-slate-500 space-y-4">
              <p className="text-sm">You haven't connected or synced any repositories yet.</p>
              <Link
                to="/settings"
                className="inline-block bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-500/10"
              >
                Go Connect Repository
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repos.map(r => (
                <div 
                  key={r._id}
                  onClick={() => navigate(`/dashboard?owner=${r.repoOwner}&repo=${r.repoName}`)}
                  className="glass-card p-5 rounded-xl border border-slate-800/50 hover:border-sky-500/40 hover:bg-slate-900/30 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <div className="font-heading font-bold text-slate-200 group-hover:text-white flex items-center gap-1.5">
                      <span>{r.repoOwner}/{r.repoName}</span>
                      {r.repoOwner === 'demo' && (
                        <span className="bg-indigo-950/60 text-indigo-400 border border-indigo-900 text-[8px] font-bold px-1 py-0.2 rounded uppercase">Demo</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Last Synced: {new Date(r.lastSyncedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-sky-400 group-hover:border-sky-500/30 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Loading view
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 flex-col gap-4">
        <div className="w-10 h-10 border-2 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
        <span className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Assembling Dashboard...</span>
      </div>
    );
  }

  // 3. Error view
  if (error || !analysis) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center space-y-6">
        <div className="w-16 h-16 bg-red-950/30 border border-red-900/40 rounded-full flex items-center justify-center text-red-400 mx-auto">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-heading font-extrabold text-white">Analysis Data Missing</h2>
          <p className="text-slate-400 text-sm">{error || 'This repository has not been synced or analyzed.'}</p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link to="/settings" className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all">
            Connect & Sync Now
          </Link>
          <Link to="/dashboard" className="text-slate-400 hover:text-white text-xs font-bold">
            Back to Selector
          </Link>
        </div>
      </div>
    );
  }

  const { metrics, aiInsights } = analysis;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8 print:py-0">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6 print:border-none print:pb-0">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-slate-500 hover:text-white text-xs font-bold flex items-center gap-1.5 no-print">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path>
              </svg>
              Repos
            </Link>
            {analysis.repoOwner === 'demo' && (
              <span className="bg-indigo-950/80 text-indigo-400 border border-indigo-900 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                Demo
              </span>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{analysis.repoOwner}</span>
            <span className="text-slate-600">/</span>
            <span className="text-sky-400">{analysis.repoName}</span>
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Synced: {new Date(analysis.lastSyncedAt).toLocaleString()}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center no-print">
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.228 9H18.06"></path>
                </svg>
                Sync GitHub
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-[0.99] shadow-md shadow-sky-500/10 flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Grid: Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Total Commits (14d)</span>
          <div className="text-3xl font-heading font-extrabold text-white">{metrics?.commitCount || 0}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Open PRs</span>
          <div className="text-3xl font-heading font-extrabold text-sky-400">{metrics?.openPRCount || 0}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Open Issues</span>
          <div className="text-3xl font-heading font-extrabold text-indigo-400">{metrics?.openIssueCount || 0}</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 shadow-md">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Active Contributors</span>
          <div className="text-3xl font-heading font-extrabold text-emerald-400">
            {metrics?.contributors?.filter(c => c.commits > 0).length || 0}
          </div>
        </div>
      </div>

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Charts & Contributors */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Commit Chart */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-md space-y-4">
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500"></span>
              Commit Activity (Last 7 Days)
            </h2>
            <div className="h-64 w-full">
              {metrics?.commitActivity && metrics.commitActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.commitActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155', 
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontFamily: 'sans-serif',
                        fontSize: '12px'
                      }} 
                    />
                    <Area type="monotone" dataKey="count" name="Commits" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCommits)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No commit activity available
                </div>
              )}
            </div>
          </div>

          {/* Team Contribution Grid */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-md space-y-4">
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Contributors Profile & Load Share
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {metrics?.contributors && metrics.contributors.length > 0 ? (
                metrics.contributors.map(c => {
                  const totalCommits = metrics.contributors.reduce((acc, current) => acc + current.commits, 0) || 1;
                  const ratio = ((c.commits / totalCommits) * 100).toFixed(0);
                  return (
                    <div key={c.username} className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex items-center gap-3.5">
                      <img 
                        src={c.avatarUrl || 'https://github.com/identicons/identicon.png'} 
                        alt={c.username}
                        className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="text-sm font-bold text-slate-200 truncate">{c.username}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{c.commits} commits</span>
                          <span className="font-semibold text-slate-300">{ratio}% load</span>
                        </div>
                        {/* Progress load indicator */}
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${ratio}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-6 text-slate-500 text-xs">
                  No contributor listings detected
                </div>
              )}
            </div>
          </div>

          {/* PR & Issue Feed */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PRs Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 shadow-md space-y-3.5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                Pull Request Feed
              </h3>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {metrics?.prActivity && metrics.prActivity.length > 0 ? (
                  metrics.prActivity.map((pr, index) => (
                    <div key={index} className="bg-slate-900/30 border border-slate-800/50 p-3 rounded-lg text-xs space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-200 leading-tight block">{pr.title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                          pr.state === 'open' 
                            ? 'bg-sky-950/40 text-sky-400 border-sky-900/50' 
                            : 'bg-indigo-950/40 text-indigo-400 border-indigo-900/50'
                        }`}>
                          {pr.state}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        by @{pr.author} • {new Date(pr.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500 text-[11px]">No recent pull requests</div>
                )}
              </div>
            </div>

            {/* Issues Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 shadow-md space-y-3.5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                Issue Tracker Feed
              </h3>
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {metrics?.issueActivity && metrics.issueActivity.length > 0 ? (
                  metrics.issueActivity.map((issue, index) => (
                    <div key={index} className="bg-slate-900/30 border border-slate-800/50 p-3 rounded-lg text-xs space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-200 leading-tight block">{issue.title}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                          issue.state === 'open' 
                            ? 'bg-red-950/40 text-red-400 border-red-900/50' 
                            : 'bg-slate-950/40 text-slate-400 border-slate-900/50'
                        }`}>
                          {issue.state}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        by @{issue.author} • {new Date(issue.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500 text-[11px]">No active issues</div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right: AI Insights Panel */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-lg space-y-6 relative overflow-hidden print:border-none print:p-0">
            {/* Glowing Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
              <div className="h-8 w-8 bg-sky-950 border border-sky-900/40 rounded-lg flex items-center justify-center text-sky-400">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-heading font-extrabold text-white">AI Coach Insights</h2>
                <p className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Productivity Engine</p>
              </div>
            </div>

            {/* Sprint Summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sprint Velocity Summary</h3>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                {aiInsights?.sprintSummary || 'No sprint summary.'}
              </p>
            </div>

            {/* Work Completed */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Work Highlights</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {aiInsights?.commitSummary || 'No highlights compiled.'}
              </p>
            </div>

            {/* Workload insights */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collaboration & Load</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {aiInsights?.contributorInsights || 'No workload analysis.'}
              </p>
            </div>

            {/* Bottlenecks detected */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-red-400">Bottlenecks & Blockers</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {aiInsights?.bottlenecks || 'No bottlenecks found.'}
              </p>
            </div>

            {/* Recommendations */}
            <div className="space-y-3 bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl print:bg-white print:border-slate-300">
              <h3 className="text-xs font-extrabold text-sky-400 uppercase tracking-wider">Next Sprint Action List</h3>
              <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line prose prose-invert font-medium max-w-none print:text-black">
                {aiInsights?.recommendations || 'No recommendations generated.'}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
