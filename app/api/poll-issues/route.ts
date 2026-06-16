import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { GoogleGenAI } from '@google/genai';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const TABLE_NAME = 'gitclaim-issues';

export async function POST() {
  try {
    // 1. Scan DynamoDB to retrieve all watchlisted repositories
    const scanResponse = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
    const items = scanResponse.Items || [];
    
    // Extract registered watchlists. Default to meshery/meshery if the watchlist is empty
    let activeTargets = items
      .filter(item => item.status === 'WATCHLIST_ITEM')
      .map(item => item.repoFullName);

    if (activeTargets.length === 0) {
      activeTargets = ['meshery/meshery'];
    }

    const crawlerSummary = [];

    for (const repo of activeTargets) {
      const githubUrl = `https://api.github.com/search/issues?q=repo:${repo}+is:issue+is:open+no:assignee&sort=created&order=desc&per_page=4`;
      
      const ghResponse = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitClaim-Autonomous-Agent'
        },
        next: { revalidate: 0 }
      });

      if (!ghResponse.ok) {
        console.warn(`Failed to poll GitHub for repository: ${repo}`);
        continue;
      }

      const ghData = await ghResponse.json();
      const rawIssues = ghData.items || [];

      for (const issue of rawIssues) {
        const issueId = String(issue.id);

        // Deduplication Check
        const checkExisting = await docClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: { issueId }
        }));

        if (checkExisting.Item) {
          continue; // Already processed, skip
        }

        // Gemini Prompt Engineering
        const prompt = `You are an open-source developer looking to claim an issue.
        Task 1: Classify this issue title into exactly one of these categories: "UI/UX", "Server", "CLI", "Security", "Documentation", or "Other".
        Task 2: Determine suitability ("isGoodMatch" is true ONLY for UI/UX, Server, or CLI).
        Task 3: Draft a brief, 2-sentence comment claiming the issue. It MUST sound like a passionate, friendly human developer. Never mention automated bots, algorithms, or platforms. Do not use generic placeholders.

        Issue Title: "${issue.title}"
        
        Return as a raw JSON object matching this structure:
        {
          "category": "string",
          "isGoodMatch": boolean,
          "proposal": "string"
        }`;

        let aiAnalysis = { category: 'Other', isGoodMatch: false, proposal: '' };
        try {
          const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
          });
          if (aiResponse.text) {
            aiAnalysis = JSON.parse(aiResponse.text.trim());
          }
        } catch (aiErr) {
          console.error(`Gemini evaluation failed for issue: ${issueId}`, aiErr);
        }

        let runStatus = 'IGNORED_DOMAIN';
        let postedCommentText = '';

        if (aiAnalysis.isGoodMatch && aiAnalysis.proposal) {
          const signature = " I am highly eager to contribute to the community on this task.";
          postedCommentText = `${aiAnalysis.proposal}${signature}`;

          const commentUrl = `https://api.github.com/repos/${repo}/issues/${issue.number}/comments`;
          const commentResponse = await fetch(commentUrl, {
            method: 'POST',
            headers: {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'User-Agent': 'GitClaim-Autonomous-Agent'
            },
            body: JSON.stringify({ body: postedCommentText })
          });

          if (commentResponse.ok) {
            runStatus = 'AUTOMATICALLY_CLAIMED';
          } else {
            console.error(`Failed to auto-comment on issue: ${repo}#${issue.number}`);
            runStatus = 'COMMENT_POST_FAILED';
          }
        }

        const dbItem = {
          issueId,
          repoFullName: repo,
          issueNumber: issue.number,
          title: issue.title,
          status: runStatus,
          category: aiAnalysis.category,
          isGoodMatch: aiAnalysis.isGoodMatch,
          aiProposal: postedCommentText || aiAnalysis.proposal || 'Skipped',
          createdAt: issue.created_at,
          url: issue.html_url
        };

        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: dbItem
        }));

        crawlerSummary.push({
          repo,
          issueNumber: issue.number,
          category: aiAnalysis.category,
          action: runStatus
        });
      }
    }

    return NextResponse.json({
      success: true,
      activeWatchlistsCount: activeTargets.length,
      summary: crawlerSummary
    });

  } catch (error: any) {
    console.error('Autonomous loop error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}