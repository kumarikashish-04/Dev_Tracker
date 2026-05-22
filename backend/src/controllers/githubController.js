const githubService = require('../services/githubService');

// @desc    Get GitHub repositories for the authenticated user
// @route   GET /api/github/repos
// @access  Private
exports.getUserRepositories = async (req, res) => {
  const token = req.user.githubToken;

  if (!token) {
    return res.status(400).json({ message: 'GitHub token is required to fetch repositories. Please connect your GitHub account in Settings.' });
  }

  try {
    const repos = await githubService.getUserRepos(token);
    res.json(repos);
  } catch (error) {
    console.error('Error fetching GitHub repositories:', error.message);
    res.status(500).json({ message: 'Unable to load GitHub repositories. Please check your token and network connection.', error: error.message });
  }
};
