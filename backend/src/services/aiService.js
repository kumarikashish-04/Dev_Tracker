const OpenAI = require("openai");

let openai = null;

/**
 * Initialize Gemini(OpenAI-compatible) Client
 */
const getOpenAIClient = () => {
  if (openai) return openai;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("OPENAI_API_KEY not found");
    return null;
  }

  openai = new OpenAI({
    apiKey: apiKey,
    baseURL: process.env.OPENAI_API_BASE,
  });

  return openai;
};

/**
 * Generate AI productivity analysis
 */
const generateProductivityAnalysis = async (
  repoName,
  repoOwner,
  metrics
) => {
  const client = getOpenAIClient();

  if (!client) {
    return generateMockAnalysis(repoName, repoOwner, metrics);
  }

  try {
    const prompt = `
Analyze this GitHub repository.

Repository: ${repoOwner}/${repoName}

Total Commits: ${metrics.commitCount}

Open PRs: ${metrics.openPRCount}
Closed PRs: ${metrics.closedPRCount}

Open Issues: ${metrics.openIssueCount}
Closed Issues: ${metrics.closedIssueCount}

Contributors:
${metrics.contributors
  .map((c) => `- ${c.username}: ${c.commits} commits`)
  .join("\n")}

Return ONLY valid JSON:

{
  "sprintSummary": "",
  "commitSummary": "",
  "contributorInsights": "",
  "bottlenecks": "",
  "recommendations": ""
}
`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gemini-1.5-pro",

      messages: [
        {
          role: "system",
          content:
            "You are an expert software engineering productivity analyst.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],

      temperature: 0.7,
    });

    const content = response.choices[0].message.content;

    console.log("AI RESPONSE:", content);

    const parsed = JSON.parse(content);

    return {
      sprintSummary: parsed.sprintSummary,
      commitSummary: parsed.commitSummary,
      contributorInsights: parsed.contributorInsights,
      bottlenecks: parsed.bottlenecks,
      recommendations: parsed.recommendations,
    };
  } catch (error) {
    console.error("Gemini API Error:");

    if (error.response) {
      console.error(error.response.data);
    } else {
      console.error(error.message);
    }

    return generateMockAnalysis(repoName, repoOwner, metrics);
  }
};

/**
 * Mock fallback
 */
const generateMockAnalysis = (
  repoName,
  repoOwner,
  metrics
) => {
  return {
    sprintSummary:
      "Sprint activity is progressing steadily with healthy development velocity.",

    commitSummary:
      `${metrics.commitCount} commits detected with active repository updates.`,

    contributorInsights:
      "Contributors are collaborating consistently across repository tasks.",

    bottlenecks:
      `${metrics.openPRCount} PRs and ${metrics.openIssueCount} open issues require review.`,

    recommendations:
      "- Review pending PRs\n- Resolve open issues\n- Improve workload distribution",
  };
};

module.exports = {
  generateProductivityAnalysis,
};