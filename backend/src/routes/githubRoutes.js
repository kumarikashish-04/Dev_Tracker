const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getUserRepositories } = require('../controllers/githubController');

router.get('/repos', auth, getUserRepositories);

module.exports = router;
