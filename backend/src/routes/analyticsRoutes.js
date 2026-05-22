const express = require('express');
const router = express.Router();
const {
  syncRepository,
  getSyncedRepositories,
  getRepositoryAnalysis,
  deleteRepository,
} = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

router.post('/sync', auth, syncRepository);
router.get('/repos', auth, getSyncedRepositories);
router.get('/repo/:owner/:repo', auth, getRepositoryAnalysis);
router.delete('/repo/:owner/:repo', auth, deleteRepository);

module.exports = router;
