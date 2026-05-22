const express = require('express');

const router = express.Router();

const {
  getGithubRepos,
} = require('../controllers/githubController');

router.get('/repos', getGithubRepos);

module.exports = router;