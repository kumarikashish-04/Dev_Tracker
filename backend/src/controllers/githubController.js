const githubService = require('../services/githubService');

// @desc    Get GitHub repositories for the authenticated user or public repos by username
// @route   GET /api/github/repos?username=:username
// @access  Private (token) or Public (username)
exports.getGithubRepos = async (req, res) => {
  const token = req.user?.githubToken;
  const username = req.query.username;

  try {
    let repos;

    if (username) {
      repos = await githubService.getPublicReposByUsername(username);
      return res.json(repos);
    }

    if (token) {
      repos = await githubService.getUserRepos(token);
      return res.json(repos);
    }

    return res.status(400).json({ message: 'Provide a GitHub personal access token or a GitHub username (query param `username`) to fetch repositories.' });
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error.message);

    let status = 500;
    let message = 'Unable to load GitHub repositories. Check credentials or network.';

    if (error.message?.toLowerCase().includes('rate limit')) {
      status = 429;
      message = 'GitHub rate limit exceeded. Use a Personal Access Token or wait before retrying.';
    } else if (error.message?.toLowerCase().includes('unauthorized') || error.message?.toLowerCase().includes('bad credentials')) {
      status = 401;
      message = 'Invalid GitHub credentials. Update or remove your token and try again.';
    }

    res.status(status).json({ message, error: error.message });
  }
};
