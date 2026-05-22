const { OpenAI } = require('openai');

let openai = null;

// Initialize OpenAI client if API key is provided
const getOpenAIClient = () => {
  if (openai) return openai;
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY is not defined. Using mock fallback for AI generation.');
    return null;
  }

  const configuration = {
    apiKey: apiKey,
  };

  // Allow custom OpenAI-compatible API base (e.g., DeepSeek, Gemini API, OpenRouter)
  if (process.env.OPENAI_API_BASE) {
    configuration.baseURL = process.env.OPENAI_API_BASE;
  }

  openai = new OpenAI(configuration);
  return openai;
};

/**
 * Generate AI productivity analysis.
 * If API Key is missing or request fails, falls back to a highly realistic mock generator.
 */
const generateProductivityAnalysis = async (repoName, repoOwner, metrics) => {
  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || 'gpt-4o';

  // Construct a concise version of raw data for the prompt
  const commitsSummary = metrics.commitActivity.slice(0, 10).map(c => `Date: ${c.date}, Commits: ${c.count}`).join('\n');
  
  // Get recent commit messages (up to 15) to make the summaries accurate
  const recentCommitsText = metrics.prActivity && metrics.prActivity.length > 0
    ? `Pull Requests:\n${metrics.prActivity.slice(0, 10).map(pr => `- [${pr.state.toUpperCase()}] ${pr.title} by ${pr.author}`).join('\n')}`
    : 'No recent pull requests';
    
  const issuesText = metrics.issueActivity && metrics.issueActivity.length > 0
    ? `Issues:\n${metrics.issueActivity.slice(0, 10).map(i => `- [${i.state.toUpperCase()}] ${i.title} by ${i.user}`).join('\n')}`
    : 'No active issues';

  const contributorsText = metrics.contributors.map(c => `- ${c.username}: ${c.commits} commits`).join('\n');

  if (!client) {
    return generateMockAnalysis(repoName, repoOwner, metrics);
  }

  try {
    const prompt = `
You are an expert AI Developer Productivity Coach. Analyze the following development metrics for the repository "${repoOwner}/${repoName}" and generate structural productivity insights, sprint summaries, and coding recommendations.

### Repository Data:
- Total Commits (Recent): ${metrics.commitCount}
- Open/Closed PRs: ${metrics.openPRCount} Open, ${metrics.closedPRCount} Closed
- Open/Closed Issues: ${metrics.openIssueCount} Open, ${metrics.closedIssueCount} Closed

### Contributors:
${contributorsText}

### Commit & PR Activity:
${recentCommitsText}

### Issue Activity:
${issuesText}

### Instructions:
Generate five components of analysis. Return your analysis strictly as a JSON object with the following string fields:
1. "sprintSummary": A concise summary (3-4 sentences) evaluating the speed and health of recent sprint cycles.
2. "commitSummary": A summary (3-4 sentences) outlining the core work completed (main features, bug fixes, refactoring) based on active pull requests and commit volumes.
3. "contributorInsights": Analysis of team collaboration, task distribution, workload balances, and identifying inactive contributors or single-points-of-failure.
4. "bottlenecks": Identification of active bottlenecks (e.g., code reviews piling up, high open-to-closed issue ratios, contributor silos).
5. "recommendations": 3-4 bulleted, highly actionable priority tasks or improvements for the next sprint.

Ensure the values are clean markdown text (bolding or bulleting is okay, but keep formatting clean and simple). Return ONLY valid JSON.
`;

    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are a professional software engineering lead and project manager. You output clean, highly structured JSON containing markdown strings.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const parsedResponse = JSON.parse(response.choices[0].message.content);
    return {
      sprintSummary: parsedResponse.sprintSummary || 'No sprint summary generated.',
      commitSummary: parsedResponse.commitSummary || 'No commit summary generated.',
      contributorInsights: parsedResponse.contributorInsights || 'No contributor insights generated.',
      bottlenecks: parsedResponse.bottlenecks || 'No bottlenecks detected.',
      recommendations: parsedResponse.recommendations || 'No recommendations generated.',
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error.message);
    console.log('Falling back to mock analysis generation due to API error.');
    return generateMockAnalysis(repoName, repoOwner, metrics);
  }
};

/**
 * High-quality mock analyzer that tailors outputs to the actual metrics
 */
const generateMockAnalysis = (repoName, repoOwner, metrics) => {
  const { commitCount, openPRCount, closedPRCount, openIssueCount, closedIssueCount, contributors } = metrics;
  
  // Deduce team size and active contributors
  const teamSize = contributors.length;
  const activeContributors = contributors.filter(c => c.commits > 0).map(c => c.username);
  const inactiveContributors = contributors.filter(c => c.commits === 0).map(c => c.username);
  
  // Deduce main developer
  let leadDeveloper = 'N/A';
  let leadCommits = 0;
  contributors.forEach(c => {
    if (c.commits > leadCommits) {
      leadCommits = c.commits;
      leadDeveloper = c.username;
    }
  });

  // Calculate work distribution skew
  const totalCommitsCalculated = contributors.reduce((acc, c) => acc + c.commits, 0) || 1;
  const leadContributionRatio = ((leadCommits / totalCommitsCalculated) * 100).toFixed(0);

  // Generate dynamic text blocks based on metrics
  let sprintSummary = '';
  if (commitCount === 0) {
    sprintSummary = `The sprint cycle for **${repoOwner}/${repoName}** has shown minimal activity recently, with no new commits detected. This indicates either a block in the deployment/development pipeline, or that the team is currently focusing on planning, design, or off-platform tasks. Stagnancy should be addressed to avoid sprint delay.`;
  } else if (commitCount > 30) {
    sprintSummary = `The sprint speed for **${repoOwner}/${repoName}** is exceptionally high, with **${commitCount} commits** recorded. Development is moving fast. PR cycles are turning over quickly with ${closedPRCount} pull requests merged, indicating strong alignment on sprint targets and rapid feature progression.`;
  } else {
    sprintSummary = `The sprint velocity is steady, showing moderate progress with **${commitCount} recent commits**. The pipeline is functional, and the team is making incremental updates. However, streamlining code reviews could help merge the remaining ${openPRCount} open PRs faster and maintain a smoother release cadence.`;
  }

  let commitSummary = '';
  if (commitCount > 0) {
    commitSummary = `Core updates focus on repository structure, minor features, and integration setups. Most efforts have been led by **${leadDeveloper}** (contributing ${leadContributionRatio}% of total commits). Recent pull requests show work centering around refactoring code, configuring API structures, and polishing UI layouts.`;
  } else {
    commitSummary = `No commit activity was recorded. The current codebase has stabilized around the existing features. New features or fixes are either in draft stage, being held in local branches, or awaiting priority assignments from product management.`;
  }

  let contributorInsights = '';
  if (teamSize === 0) {
    contributorInsights = 'No contributors detected in this repository. Ensure that developers are active and committing with verified email addresses to populate activity charts.';
  } else {
    contributorInsights = `The work distribution is heavily concentrated. **${leadDeveloper}** is the primary contributor (${leadCommits} commits), indicating a potential key-person dependency (bus factor of 1). `;
    
    if (inactiveContributors.length > 0) {
      contributorInsights += `Contributors **${inactiveContributors.join(', ')}** have been inactive during this analysis period. We recommend checking in to ensure there are no onboarding blocks or environment issues.`;
    } else {
      contributorInsights += `All ${teamSize} registered contributors have recorded commit activity, showing healthy, collaborative team engagement, though task loading could be balanced further.`;
    }
  }

  let bottlenecks = '';
  if (openPRCount > 4 || openIssueCount > 10) {
    bottlenecks = `We've detected potential friction points:
1. **PR Backlog**: There are **${openPRCount} open pull requests** waiting for reviews. A slow review loop delays feature releases and increases merge conflicts.
2. **Issue Accumulation**: With **${openIssueCount} open issues**, the support and bug backlog is growing faster than it is being resolved (${closedIssueCount} closed).
3. **Knowledge Silo**: **${leadDeveloper}** holds a disproportionate amount of repository context. Code reviews from other team members should be prioritized.`;
  } else {
    bottlenecks = `The pipeline is relatively clean. The issue ratio (**${openIssueCount} Open** vs **${closedIssueCount} Closed**) is healthy, and pull requests (${openPRCount} Open) are being managed in a timely manner. No major structural bottlenecks are currently active.`;
  }

  let recommendations = '';
  if (commitCount === 0) {
    recommendations = `- **Define Sprint Goals**: Establish clear, small tasks in issues to unblock commit velocity.
- **Onboard Inactive Members**: Check in with inactive members to resolve developer environment setup issues.
- **Sync Git Configs**: Ensure team members are committing with verified GitHub profiles.`;
  } else {
    recommendations = `- **Balance Workloads**: Delegate minor feature tickets or bug fixes to other contributors to reduce the load on **${leadDeveloper}**.
- **Close the PR Loop**: Schedule dedicated times for developers to review the **${openPRCount} open PRs** to unblock deployments.
- **Prioritize Issue Backlog**: Sort and tackle the **${openIssueCount} open issues**; assign them based on current expertise.`;
  }

  return {
    sprintSummary,
    commitSummary,
    contributorInsights,
    bottlenecks,
    recommendations,
  };
};

module.exports = {
  generateProductivityAnalysis,
};
