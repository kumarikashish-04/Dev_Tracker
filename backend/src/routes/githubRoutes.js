const express = require('express');

const router = express.Router();
const auth = require('../middleware/auth');

const {
  getGithubRepos,
} = require('../controllers/githubController');

// Support both authenticated requests (JWT in Authorization header)
// and unauthenticated public lookups by `?username=`.
router.get('/repos', (req, res) => {
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // run auth middleware then controller
    return auth(req, res, () => getGithubRepos(req, res));
  }

  // no auth header - allow public username-based fetch
  return getGithubRepos(req, res);
});

module.exports = router;