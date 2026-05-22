const axios = require('axios');

const GITHUB_API_URL = 'https://api.github.com';

const getHeaders = (token) => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DevTrackr-App',
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }
  return headers;
};

/**
 * Fetch repositories of the authenticated user
 */
const getUserRepos = async (token) => {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/user/repos`, {
      headers: getHeaders(token),
      params: {
        sort: 'updated',
        per_page: 50,
      },
    });
    return response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      owner: repo.owner.login,
      fullName: repo.full_name,
      description: repo.description,
      htmlUrl: repo.html_url,
      private: repo.private,
      stars: repo.stargazers_count,
      language: repo.language,
    }));
  } catch (error) {
    console.error('Error fetching user repositories:', error.message);
    throw new Error(error.response?.data?.message || 'Failed to fetch repositories from GitHub');
  }
};

/**
 * Fetch recent commits (last 14 days)
 */
const getRepoCommits = async (owner, repo, token, sinceDate) => {
  try {
    const params = { per_page: 100 };
    if (sinceDate) {
      params.since = sinceDate;
    }
    const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/commits`, {
      headers: getHeaders(token),
      params,
    });
    return response.data.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      username: c.author?.login || c.commit.author.name,
      email: c.commit.author.email,
      date: c.commit.author.date,
      avatarUrl: c.author?.avatar_url || '',
    }));
  } catch (error) {
    console.warn(`Error fetching commits for ${owner}/${repo}:`, error.message);
    // Return empty array if commits are not found or accessible
    return [];
  }
};

/**
 * Fetch open and closed pull requests (last 50)
 */
const getRepoPRs = async (owner, repo, token) => {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/pulls`, {
      headers: getHeaders(token),
      params: {
        state: 'all',
        per_page: 50,
        sort: 'updated',
        direction: 'desc',
      },
    });
    return response.data.map(pr => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      user: pr.user.login,
      avatarUrl: pr.user.avatar_url,
      createdAt: pr.created_at,
      closedAt: pr.closed_at,
      mergedAt: pr.merged_at,
    }));
  } catch (error) {
    console.warn(`Error fetching PRs for ${owner}/${repo}:`, error.message);
    return [];
  }
};

/**
 * Fetch open and closed issues (last 50)
 */
const getRepoIssues = async (owner, repo, token) => {
  try {
    const response = await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}/issues`, {
      headers: getHeaders(token),
      params: {
        state: 'all',
        per_page: 50,
        sort: 'updated',
        direction: 'desc',
      },
    });
    // Filter out pull requests, as GitHub API returns PRs in the Issues endpoint
    return response.data
      .filter(issue => !issue.pull_request)
      .map(issue => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        user: issue.user.login,
        avatarUrl: issue.user.avatar_url,
        createdAt: issue.created_at,
        closedAt: issue.closed_at,
      }));
  } catch (error) {
    console.warn(`Error fetching issues for ${owner}/${repo}:`, error.message);
    return [];
  }
};

module.exports = {
  getUserRepos,
  getRepoCommits,
  getRepoPRs,
  getRepoIssues,
};
