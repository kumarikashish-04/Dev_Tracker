const githubService = require('../services/githubService');
const aiService = require('../services/aiService');
const Analysis = require('../models/analysis');

// Helper to group commits by date YYYY-MM-DD
const processCommitActivity = (commits) => {
  const activityMap = {};
  
  // Initialize last 7 days with 0 commits to ensure charts render even if no commits
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    activityMap[dateStr] = 0;
  }

  commits.forEach(commit => {
    try {
      const dateStr = new Date(commit.date).toISOString().split('T')[0];
      // Only include it if it's within our range or increment
      if (activityMap[dateStr] !== undefined) {
        activityMap[dateStr] += 1;
      } else {
        activityMap[dateStr] = 1;
      }
    } catch (e) {
      // Ignore date parsing issues
    }
  });

  return Object.keys(activityMap)
    .sort()
    .map(date => ({ date, count: activityMap[date] }));
};

// Helper to aggregate contributors from commits
const processContributors = (commits, prs, issues) => {
  const contributorMap = {};

  // Track commits
  commits.forEach(commit => {
    const username = commit.username || 'unknown';
    if (!contributorMap[username]) {
      contributorMap[username] = { username, commits: 0, avatarUrl: commit.avatarUrl || '' };
    }
    contributorMap[username].commits += 1;
  });

  // Track PR authors (in case they have no commits but did PRs)
  prs.forEach(pr => {
    const username = pr.user;
    if (!contributorMap[username]) {
      contributorMap[username] = { username, commits: 0, avatarUrl: pr.avatarUrl || '' };
    }
  });

  // Track issue authors
  issues.forEach(issue => {
    const username = issue.user;
    if (!contributorMap[username]) {
      contributorMap[username] = { username, commits: 0, avatarUrl: issue.avatarUrl || '' };
    }
  });

  return Object.values(contributorMap).sort((a, b) => b.commits - a.commits);
};

// @desc    Sync repository data and generate analysis
// @route   POST /api/analytics/sync
// @access  Private
exports.syncRepository = async (req, res) => {
  const { owner, repo } = req.body;
  const userId = req.user._id;
  const token = req.user.githubToken;

  if (!owner || !repo) {
    return res.status(400).json({ message: 'Please provide both owner and repository name' });
  }

  const cleanOwner = owner.trim();
  const cleanRepo = repo.trim();

  try {
    let metrics = {};
    
    // DEMO / MOCK Mode: If owner is 'demo', generate mock repo metrics
    if (cleanOwner.toLowerCase() === 'demo') {
      metrics = generateMockMetrics(cleanOwner, cleanRepo);
    } else {
      // Real API Calls to GitHub
      // Get commits from last 14 days
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 14);
      
      const commits = await githubService.getRepoCommits(cleanOwner, cleanRepo, token, sinceDate.toISOString());
      const prs = await githubService.getRepoPRs(cleanOwner, cleanRepo, token);
      const issues = await githubService.getRepoIssues(cleanOwner, cleanRepo, token);

      const openPRs = prs.filter(pr => pr.state === 'open');
      const closedPRs = prs.filter(pr => pr.state === 'closed');
      const openIssues = issues.filter(issue => issue.state === 'open');
      const closedIssues = issues.filter(issue => issue.state === 'closed');

      const commitActivity = processCommitActivity(commits);
      const contributors = processContributors(commits, prs, issues);

      metrics = {
        commitCount: commits.length,
        openPRCount: openPRs.length,
        closedPRCount: closedPRs.length,
        openIssueCount: openIssues.length,
        closedIssueCount: closedIssues.length,
        contributors,
        commitActivity,
        prActivity: prs.slice(0, 15).map(pr => ({
          title: pr.title,
          state: pr.state,
          created_at: pr.createdAt,
          author: pr.user,
        })),
        issueActivity: issues.slice(0, 15).map(issue => ({
          title: issue.title,
          state: issue.state,
          created_at: issue.createdAt,
          author: issue.user,
        })),
      };
    }

    // Call AI service to generate productivity insights
    const aiInsights = await aiService.generateProductivityAnalysis(cleanRepo, cleanOwner, metrics);

    // Save or update in MongoDB
    const filter = { userId, repoOwner: cleanOwner.toLowerCase(), repoName: cleanRepo.toLowerCase() };
    const update = {
      userId,
      repoOwner: cleanOwner.toLowerCase(),
      repoName: cleanRepo.toLowerCase(),
      lastSyncedAt: new Date(),
      metrics,
      aiInsights,
    };

    const analysis = await Analysis.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    res.json(analysis);
  } catch (error) {
    console.error(`Sync error for ${cleanOwner}/${cleanRepo}:`, error.message);
    res.status(500).json({ 
      message: 'Failed to sync repository and generate AI insights', 
      error: error.message 
    });
  }
};

// @desc    Get all connected/synced repositories for user
// @route   GET /api/analytics/repos
// @access  Private
exports.getSyncedRepositories = async (req, res) => {
  try {
    const repos = await Analysis.find({ userId: req.user._id })
      .select('repoOwner repoName lastSyncedAt metrics.commitCount metrics.openPRCount metrics.openIssueCount')
      .sort({ updatedAt: -1 });
    res.json(repos);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get repository analysis
// @route   GET /api/analytics/repo/:owner/:repo
// @access  Private
exports.getRepositoryAnalysis = async (req, res) => {
  const { owner, repo } = req.params;
  const userId = req.user._id;

  try {
    const analysis = await Analysis.findOne({
      userId,
      repoOwner: owner.toLowerCase(),
      repoName: repo.toLowerCase(),
    });

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found. Please sync this repository first.' });
    }

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete repository analysis
// @route   DELETE /api/analytics/repo/:owner/:repo
// @access  Private
exports.deleteRepository = async (req, res) => {
  const { owner, repo } = req.params;
  const userId = req.user._id;

  try {
    const result = await Analysis.findOneAndDelete({
      userId,
      repoOwner: owner.toLowerCase(),
      repoName: repo.toLowerCase(),
    });

    if (!result) {
      return res.status(404).json({ message: 'Repository not found' });
    }

    res.json({ message: 'Repository disconnected and analysis deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Generate mock repository metrics for Demo Mode
 */
const generateMockMetrics = (owner, repo) => {
  // Generate last 7 days commit activity
  const commitActivity = [];
  const activityPatterns = {
    devtracker: [4, 8, 3, 5, 12, 6, 2],
    react: [15, 22, 18, 25, 12, 5, 8],
    default: [2, 5, 1, 4, 3, 0, 2]
  };
  
  const pattern = activityPatterns[repo.toLowerCase()] || activityPatterns.default;
  let totalCommits = 0;
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = pattern[6 - i] !== undefined ? pattern[6 - i] : Math.floor(Math.random() * 5);
    totalCommits += count;
    commitActivity.push({ date: dateStr, count });
  }

  // Set mock PRs
  const prActivity = [
    { title: 'feat: add ai recommendation engine', state: 'open', created_at: new Date(Date.now() - 86400000).toISOString(), author: 'developer-jane' },
    { title: 'fix: charts responsive scaling on mobile views', state: 'open', created_at: new Date(Date.now() - 172800000).toISOString(), author: 'alex-code' },
    { title: 'refactor: simplify db schema for repository index', state: 'closed', created_at: new Date(Date.now() - 345600000).toISOString(), author: 'lead-dev' },
    { title: 'docs: setup instructions in README.md', state: 'closed', created_at: new Date(Date.now() - 518400000).toISOString(), author: 'developer-jane' },
  ];

  // Set mock Issues
  const issueActivity = [
    { title: 'bug: token verification fails on server restart', state: 'open', created_at: new Date(Date.now() - 43200000).toISOString(), author: 'alex-code' },
    { title: 'perf: heavy load on github API sync hook', state: 'open', created_at: new Date(Date.now() - 259200000).toISOString(), author: 'lead-dev' },
    { title: 'feat: download report as PDF', state: 'open', created_at: new Date(Date.now() - 604800000).toISOString(), author: 'product-manager' },
    { title: 'bug: main navbar layout overflow on narrow width', state: 'closed', created_at: new Date(Date.now() - 864000000).toISOString(), author: 'alex-code' },
  ];

  // Set mock Contributors
  const contributors = [
    { username: 'lead-dev', commits: Math.floor(totalCommits * 0.6), avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { username: 'developer-jane', commits: Math.floor(totalCommits * 0.3), avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { username: 'alex-code', commits: Math.floor(totalCommits * 0.1), avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
    { username: 'idle-contributor', commits: 0, avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80' },
  ];

  return {
    commitCount: totalCommits,
    openPRCount: prActivity.filter(pr => pr.state === 'open').length,
    closedPRCount: prActivity.filter(pr => pr.state === 'closed').length,
    openIssueCount: issueActivity.filter(issue => issue.state === 'open').length,
    closedIssueCount: issueActivity.filter(issue => issue.state === 'closed').length,
    contributors,
    commitActivity,
    prActivity,
    issueActivity,
  };
};
