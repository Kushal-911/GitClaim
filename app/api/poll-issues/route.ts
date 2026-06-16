import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { GoogleGenAI } from '@google/genai';

// Initialize AWS DynamoDB
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Initialize Gemini AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TARGET_REPO = 'meshery/meshery';

export async function POST() {
  try {
    // 1. Fetch unassigned issues from GitHub
    const githubUrl = `https://api.github.com/search/issues?q=repo:${TARGET_REPO}+is:issue+is:open+no:assignee&sort=created&order=desc&per_page=5`;
    
    const ghResponse = await fetch(githubUrl, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitClaim-Autonomous-Agent'
      },
      next: { revalidate: 0 } // No caching
    });

    if (!ghResponse.ok) {
      const errorText = await ghResponse.text();
      return NextResponse.json({ error: `GitHub failed: ${errorText}` }, { status: ghResponse.status });
    }

    const ghData = await ghResponse.json();
    const rawIssues = ghData.items || [];
    const processedReport = [];

    for (const issue of rawIssues) {
      const issueId = String(issue.id);
      const title = issue.title;

      // 2. CHECK DYNAMODB FOR DEDUPLICATION
      // If we've seen this issue ID before, skip it entirely
      const checkExisting = await docClient.send(new GetCommand({
        TableName: 'gitclaim-issues',
        Key: { issueId }
      }));

      if (checkExisting.Item) {
        continue; // Move to the next issue
      }

      // 3. AI EVALUATION & HUMANIZED DRAFT GENERATION
      const prompt = `You are an open-source contributor seeking to claim an issue.
      Task 1: Classify this issue title into exactly one of these categories: "UI/UX", "Server", "CLI", "Security", "Documentation", or "Other".
      Task 2: Determine suitability ("isGoodMatch" is true ONLY for UI/UX, Server, or CLI).
      Task 3: Draft a brief, 2-sentence comment claiming the issue. It MUST sound like a passionate, friendly human developer. Never mention automated bots, algorithms, or platforms.

      Issue Title: "${title}"
      
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
        console.error('Gemini call failed for issue', issueId, aiErr);
      }

      let runStatus = 'IGNORED_DOMAIN';
      let postedCommentText = '';

      // 4. AUTONOMOUS AUTO-COMMENT TRIGGER
      // If it's a domain we care about, post the comment live!
      if (aiAnalysis.isGoodMatch && aiAnalysis.proposal) {
        // Append your unique persona
        const signature = " I am highly eager to contribute to the Meshery community on this task.";
        postedCommentText = `${aiAnalysis.proposal}${signature}`;

        // POST COMMENT DIRECTLY TO THE LIVE GITHUB ISSUE
        const commentUrl = `https://api.github.com/repos/${TARGET_REPO}/issues/${issue.number}/comments`;
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
          console.error('Failed to auto-comment:', await commentResponse.text());
          runStatus = 'COMMENT_POST_FAILED';
        }
      }

      // 5. STORE STATE TO DYNAMODB
      const dbItem = {
        issueId,
        repoFullName: TARGET_REPO,
        issueNumber: issue.number,
        title,
        status: runStatus,
        category: aiAnalysis.category,
        isGoodMatch: aiAnalysis.isGoodMatch,
        aiProposal: postedCommentText || aiAnalysis.proposal || 'Skipped',
        createdAt: issue.created_at,
        url: issue.html_url
      };

      await docClient.send(new PutCommand({
        TableName: 'gitclaim-issues',
        Item: dbItem
      }));

      processedReport.push({
        issueNumber: issue.number,
        category: aiAnalysis.category,
        action: runStatus
      });
    }

    return NextResponse.json({
      success: true,
      summary: processedReport
    });

  } catch (error: any) {
    console.error('Autonomous loop error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}