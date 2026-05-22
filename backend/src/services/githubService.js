const axios = require('axios');
const axiosRetry = require('axios-retry');

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Retry failed requests automatically
 */
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkError(error) ||
      error.response?.status >= 500
    );
  },
});

/**
 * Common headers for GitHub API
 */
const getHeaders = (token) => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'DevTrackr-App',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Common axios config
 */
const getAxiosConfig = (token, params = {}) => ({
  headers: getHeaders(token),
  params,
  timeout: 10000, // 10 seconds timeout
});

/**
 * Handle GitHub API errors properly
 */
const handleGitHubError = (error, customMessage) => {
  console.error('GitHub API Error:', {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
  });

  if (error.response?.status === 401) {
    throw new Error('Unauthorized: Invalid GitHub token');
  }

  if (error.response?.status === 403) {
    throw new Error('GitHub API rate limit exceeded');
  }

  if (error.response?.status === 404) {
    throw new Error('Requested GitHub resource not found');
  }

  throw new Error(
    error.response?.data?.message ||
    customMessage ||
    'GitHub API request failed'
  );
};

/**
 * Fetch repositories of authenticated user
 */
const getUserRepos = async (token) => {
  try {
    const response = await axios.get(
      `${GITHUB_API_URL}/user/repos`,
      getAxiosConfig(token, {
        sort: 'updated',
        per_page: 100,
      })
    );

    return response.data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      owner: repo.owner.login,
      fullName: repo.full_name,
      description: repo.description,
      htmlUrl: repo.html_url,
      private: repo.private,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      watchers: repo.watchers_count,
      language: repo.language,
      defaultBranch: repo.default_branch,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
    }));
  } catch (error) {
    handleGitHubError(error, 'Failed to fetch repositories');
  }
};

/**
 * Fetch repository commits
 */
const getRepoCommits = async (
  owner,
  repo,
  token,
  sinceDate = null
) => {
  try {
    const params = {
      per_page: 100,
    };

    if (sinceDate) {
      params.since = sinceDate;
    }

    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/commits`,
      getAxiosConfig(token, params)
    );

    return response.data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      username:
        commit.author?.login ||
        commit.commit.author.name,
      email: commit.commit.author.email,
      date: commit.commit.author.date,
      avatarUrl: commit.author?.avatar_url || '',
      commitUrl: commit.html_url,
    }));
  } catch (error) {
    /**
     * Empty repositories return 409
     */
    if (error.response?.status === 409) {
      console.warn(`Repository ${owner}/${repo} is empty`);
      return [];
    }

    console.warn(
      `Error fetching commits for ${owner}/${repo}:`,
      error.message
    );

    return [];
  }
};

/**
 * Fetch pull requests
 */
const getRepoPRs = async (owner, repo, token) => {
  try {
    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/pulls`,
      getAxiosConfig(token, {
        state: 'all',
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      })
    );

    return response.data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      user: pr.user.login,
      avatarUrl: pr.user.avatar_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      mergedAt: pr.merged_at,
      prUrl: pr.html_url,
    }));
  } catch (error) {
    console.warn(
      `Error fetching PRs for ${owner}/${repo}:`,
      error.message
    );

    return [];
  }
};

/**
 * Fetch issues
 */
const getRepoIssues = async (owner, repo, token) => {
  try {
    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/issues`,
      getAxiosConfig(token, {
        state: 'all',
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      })
    );

    /**
     * GitHub issues API also returns PRs
     * So we filter them out
     */
    return response.data
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        user: issue.user.login,
        avatarUrl: issue.user.avatar_url,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        closedAt: issue.closed_at,
        comments: issue.comments,
        issueUrl: issue.html_url,
      }));
  } catch (error) {
    console.warn(
      `Error fetching issues for ${owner}/${repo}:`,
      error.message
    );

    return [];
  }
};

/**
 * Fetch repository details
 */
const getRepoDetails = async (owner, repo, token) => {
  try {
    const response = await axios.get(
      `${GITHUB_API_URL}/repos/${owner}/${repo}`,
      getAxiosConfig(token)
    );

    const repoData = response.data;

    return {
      id: repoData.id,
      name: repoData.name,
      fullName: repoData.full_name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      watchers: repoData.watchers_count,
      openIssues: repoData.open_issues_count,
      language: repoData.language,
      private: repoData.private,
      defaultBranch: repoData.default_branch,
      repoUrl: repoData.html_url,
      createdAt: repoData.created_at,
      updatedAt: repoData.updated_at,
    };
  } catch (error) {
    handleGitHubError(error, 'Failed to fetch repository details');
  }
};

module.exports = {
  getUserRepos,
  getRepoCommits,
  getRepoPRs,
  getRepoIssues,
  getRepoDetails,
};