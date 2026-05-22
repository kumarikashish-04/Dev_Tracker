import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import api from '../api/api';

export default function Settings() {
  const { user, updateGithubToken } = useAuth();
  const navigate = useNavigate();
  const [githubToken, setGithubToken] = useState(user?.githubToken || '');
  const [githubUsername, setGithubUsername] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenSuccess, setTokenSuccess] = useState(false);

  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState('');

  const [connectedRepos, setConnectedRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(true);

  const [githubRepos, setGithubRepos] = useState([]);
  const [githubReposLoading, setGithubReposLoading] = useState(false);
  const [githubRepoError, setGithubRepoError] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);

  // ─── FIX: accept a `silent` flag so auto-calls on mount don't flash errors ───
  const fetchGithubRepos = useCallback(async (silent = false) => {
    // ─── FIX: guard — don't call API if there's nothing to authenticate with ───
    if (!user?.githubToken && !githubUsername) {
      if (!silent) {
        setGithubRepoError(
          'Enter a GitHub username for public repositories, or provide a PAT to access private repos.'
        );
      }
      return;
    }

    try {
      setGithubRepoError('');
      setGithubReposLoading(true);
      let endpoint = '/github/repos';
      if (githubUsername) {
        endpoint += `?username=${encodeURIComponent(githubUsername)}`;
      }
      const data = await api.get(endpoint);
      setGithubRepos(data);
    } catch (err) {
      console.error('Failed to fetch GitHub repositories:', err.message);
      // ─── FIX: only show error if not a silent/background call ───
      if (!silent) {
        setGithubRepoError(err.message || 'Failed to load GitHub repositories.');
      }
    } finally {
      setGithubReposLoading(false);
    }
  // ─── FIX: only depend on githubUsername, NOT fetchGithubRepos itself ───
  }, [user?.githubToken, githubUsername]);

  // Load connected repos on mount
  const fetchRepos = useCallback(async () => {
    try {
      setReposLoading(true);
      const data = await api.get('/analytics/repos');
      setConnectedRepos(data);
    } catch (err) {
      console.error('Failed to fetch repositories:', err.message);
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      setGithubToken(user.githubToken || '');
      await fetchRepos();

      // ─── FIX: Only auto-fetch GitHub repos if a username is provided.
      //         DO NOT auto-fetch using the stored PAT on mount — it may be
      //         expired/invalid and will fire a 401 before the user can act.
      //         Users should click "Refresh" after confirming/saving their token. ───
      if (githubUsername) {
        await fetchGithubRepos(true); // silent = true → no error flash on load
      }
    };

    loadSettings();
  // ─── FIX: removed fetchGithubRepos from deps to prevent infinite re-fetch loop ───
  }, [user, fetchRepos]);

  const handleSaveToken = async (e) => {
    e.preventDefault();
    setTokenLoading(true);
    setTokenSuccess(false);
    try {
      await updateGithubToken(githubToken);
      setTokenSuccess(true);
      setTimeout(() => setTokenSuccess(false), 3000);
      await fetchRepos();
      // ─── FIX: after saving a new token, immediately refresh GitHub repos
      //         so the repo list reflects the new (valid) token ───
      await fetchGithubRepos(false);
    } catch (err) {
      alert('Failed to update token: ' + err.message);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleConnectRepo = async (e) => {
    e.preventDefault();
    if (!owner || !repo) {
      return setSyncError('Please specify repository owner and name');
    }
    setSyncLoading(true);
    setSyncError('');
    try {
      const data = await api.post('/analytics/sync', { owner, repo });
      setOwner('');
      setRepo('');
      await fetchRepos();
      navigate(`/dashboard?owner=${data.repoOwner}&repo=${data.repoName}`);
    } catch (err) {
      setSyncError(
        err.message ||
          'Sync failed. Check credentials, repository path, or network rate limits.'
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const handleDeleteRepo = async (ownerName, repoName) => {
    if (
      !window.confirm(
        `Disconnect ${ownerName}/${repoName} and delete all stored analysis?`
      )
    )
      return;
    try {
      await api.delete(`/analytics/repo/${ownerName}/${repoName}`);
      await fetchRepos();
    } catch (err) {
      alert('Failed to delete repository: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex-1 w-full space-y-10">
      <div>
        <h1 className="text-4xl font-heading font-extrabold text-white tracking-tight">
          Integrations & Connections
        </h1>
        <p className="text-slate-400 mt-2 text-base">
          Configure your GitHub API keys and connect repositories to trigger AI
          insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connection Setup Column */}
        <div className="lg:col-span-1 space-y-8">
          {/* GitHub Token Config Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800">
                <svg
                  className="w-5.5 h-5.5 text-slate-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-heading font-bold text-white">
                  GitHub API Token
                </h2>
                <p className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">
                  Credentials
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveToken} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-2">
                  GitHub Username (public repos)
                </label>
                <input
                  type="text"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="e.g. facebook"
                  className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-600 px-4 py-3 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-2">
                  Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-600 px-4 py-3 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono text-xs"
                />
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl">
                <span className="block text-[11px] font-bold text-sky-400 uppercase mb-1">
                  💡 Token Requirements
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Generate a <strong>Personal Access Token (Classic)</strong> on
                  GitHub with the{' '}
                  <code className="text-slate-300 bg-slate-800 px-1 rounded">
                    repo
                  </code>{' '}
                  scope enabled so DevTrackr can scan repository commits,
                  branches, and issue backlogs.
                </p>
              </div>

              <button
                type="submit"
                disabled={tokenLoading}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold py-2.5 rounded-xl border border-slate-700/60 transition-all active:scale-[0.99] disabled:opacity-50 text-xs flex items-center justify-center gap-2"
              >
                {tokenLoading
                  ? 'Saving...'
                  : tokenSuccess
                  ? '✓ Token Saved'
                  : 'Save Connection Token'}
              </button>
            </form>
          </div>

          {/* Connect Repo Form Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800">
                <svg
                  className="w-5.5 h-5.5 text-sky-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-heading font-bold text-white">
                  Sync Repository
                </h2>
                <p className="text-[11px] text-sky-400 font-semibold tracking-wide uppercase">
                  New Connection
                </p>
              </div>
            </div>

            <form onSubmit={handleConnectRepo} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                    Repository Owner
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g. facebook (or 'demo' for mock)"
                    className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-600 px-4 py-2.5 rounded-xl focus:outline-none focus:border-sky-500 transition-all text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-xs font-semibold mb-1.5">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    placeholder="e.g. react (or 'devtracker' for mock)"
                    className="w-full bg-slate-900/60 border border-slate-800 text-slate-100 placeholder-slate-600 px-4 py-2.5 rounded-xl focus:outline-none focus:border-sky-500 transition-all text-xs"
                    required
                  />
                </div>
              </div>

              {syncError && (
                <div className="text-[11px] text-red-400 bg-red-950/20 border border-red-900/40 p-2.5 rounded-lg leading-relaxed">
                  {syncError}
                </div>
              )}

              <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl text-[11px] text-slate-400 space-y-1">
                <span className="block font-bold text-indigo-400 uppercase">
                  🚀 Try Demo Mode
                </span>
                <p>
                  No token or key? Input Owner{' '}
                  <code className="text-slate-300 font-mono font-bold">
                    demo
                  </code>{' '}
                  and Name{' '}
                  <code className="text-slate-300 font-mono font-bold">
                    devtracker
                  </code>{' '}
                  (or{' '}
                  <code className="text-slate-300 font-mono font-bold">
                    react
                  </code>
                  ) to load simulated data instantly!
                </p>
              </div>

              <button
                type="submit"
                disabled={syncLoading}
                className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2.5 rounded-xl transition-all active:scale-[0.99] disabled:opacity-50 text-xs shadow-md shadow-sky-500/10 flex items-center justify-center gap-2"
              >
                {syncLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-slate-950"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Syncing & Analyzing...
                  </>
                ) : (
                  'Sync & Connect Repository'
                )}
              </button>
            </form>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  GitHub Repositories
                </h3>
                {/* ─── FIX: Refresh button calls fetchGithubRepos with silent=false
                           so the user intentionally triggers a fetch and sees errors ─── */}
                <button
                  type="button"
                  onClick={() => fetchGithubRepos(false)}
                  className="text-slate-300 text-[10px] uppercase tracking-wide font-semibold hover:text-white"
                >
                  Refresh
                </button>
              </div>

              {githubReposLoading ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Loading GitHub repositories…
                </div>
              ) : githubRepoError ? (
                <div className="p-3 text-[11px] text-red-300 bg-red-950/20 border border-red-900/40 rounded-lg">
                  {githubRepoError}
                </div>
              ) : githubRepos.length === 0 ? (
                <div className="p-4 text-[11px] text-slate-400 bg-slate-950/50 rounded-xl">
                  Add your GitHub PAT and click refresh to select from your
                  repositories.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {githubRepos.map((repoItem) => (
                    <button
                      key={repoItem.id}
                      type="button"
                      onClick={() => {
                        setOwner(repoItem.owner);
                        setRepo(repoItem.name);
                        setSelectedRepo(repoItem);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all ${
                        selectedRepo?.id === repoItem.id
                          ? 'border-sky-500 bg-slate-900/90'
                          : 'border-slate-800/60 bg-slate-950/50 hover:border-slate-600 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-200 text-sm truncate">
                            {repoItem.owner}/{repoItem.name}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                            {repoItem.description || 'No description available'}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {repoItem.private ? 'Private' : 'Public'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Repositories List Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-heading font-bold text-white">
                  Connected Repositories
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Active analytical instances associated with this dashboard
                </p>
              </div>
              <button
                onClick={fetchRepos}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                title="Refresh List"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.228 9H18.06"
                  ></path>
                </svg>
              </button>
            </div>

            {reposLoading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-sky-500/20 border-t-sky-500 animate-spin"></div>
                <span className="text-xs font-medium">
                  Loading repositories...
                </span>
              </div>
            ) : connectedRepos.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <svg
                  className="w-12 h-12 text-slate-700 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  ></path>
                </svg>
                <div className="text-sm font-semibold text-slate-400">
                  No repositories connected yet
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Use the connection panel on the left to sync your first
                  repository using a GitHub PAT or try out Demo Mode.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {connectedRepos.map((r) => (
                  <div
                    key={r._id}
                    className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-900/20 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-white text-base">
                          {r.repoOwner}/{r.repoName}
                        </span>
                        {r.repoOwner === 'demo' && (
                          <span className="bg-indigo-950 text-indigo-400 border border-indigo-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                            Demo Mode
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 text-xs">
                        <span>
                          Commits:{' '}
                          <strong className="text-slate-300 font-semibold">
                            {r.metrics?.commitCount || 0}
                          </strong>
                        </span>
                        <span>
                          Open PRs:{' '}
                          <strong className="text-slate-300 font-semibold">
                            {r.metrics?.openPRCount || 0}
                          </strong>
                        </span>
                        <span>
                          Open Issues:{' '}
                          <strong className="text-slate-300 font-semibold">
                            {r.metrics?.openIssueCount || 0}
                          </strong>
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 font-mono">
                        Synced: {new Date(r.lastSyncedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() =>
                          navigate(
                            `/dashboard?owner=${r.repoOwner}&repo=${r.repoName}`
                          )
                        }
                        className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
                      >
                        Open Dashboard
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M9 5l7 7-7 7"
                          ></path>
                        </svg>
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteRepo(r.repoOwner, r.repoName)
                        }
                        className="p-2 border border-slate-800 hover:border-red-900/60 text-slate-500 hover:text-red-400 bg-slate-900 hover:bg-red-950/20 rounded-lg transition-all"
                        title="Disconnect Repo"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          ></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}