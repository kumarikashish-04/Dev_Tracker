const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    repoName: {
      type: String,
      required: true,
    },
    repoOwner: {
      type: String,
      required: true,
    },
    githubRepoId: {
      type: Number,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
    metrics: {
      commitCount: { type: Number, default: 0 },
      openPRCount: { type: Number, default: 0 },
      closedPRCount: { type: Number, default: 0 },
      openIssueCount: { type: Number, default: 0 },
      closedIssueCount: { type: Number, default: 0 },
      contributors: [
        {
          username: String,
          commits: Number,
          avatarUrl: String,
        }
      ],
      commitActivity: [
        {
          date: String, // YYYY-MM-DD
          count: Number,
        }
      ],
      prActivity: [
        {
          title: String,
          state: String,
          created_at: String,
          author: String,
        }
      ],
      issueActivity: [
        {
          title: String,
          state: String,
          created_at: String,
          author: String,
        }
      ]
    },
    aiInsights: {
      sprintSummary: { type: String, default: '' },
      commitSummary: { type: String, default: '' },
      contributorInsights: { type: String, default: '' },
      bottlenecks: { type: String, default: '' },
      recommendations: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index so a user only has one analysis record per repository
analysisSchema.index({ userId: 1, repoOwner: 1, repoName: 1 }, { unique: true });

module.exports = mongoose.model('Analysis', analysisSchema);
