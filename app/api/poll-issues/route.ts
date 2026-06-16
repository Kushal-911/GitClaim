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
    const scanResponse = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
    const items = scanResponse.Items || [];
    
    let activeTargets = items
      .filter(item => item.status === 'WATCHLIST_ITEM')
      .map(item => item.repoFullName);

    // Default target fallback if watchlist manager is empty
    if (activeTargets.length === 0) {
      activeTargets = ['meshery/meshery'];
    }

    const crawlerSummary = [];

    for (const repo of activeTargets) {
      const githubUrl = `https://api.github.com/search/issues?q=repo:${repo}+is:issue+is:open+no:assignee&sort=created&order=desc&per_page=5`;
      
      const ghResponse = await fetch(githubUrl, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'GitClaim-Autonomous-Agent'
        },
        next: { revalidate: 0 }
      });

      if (!ghResponse.ok) {
        console.warn(`Failed to poll GitHub repository: ${repo}`);
        continue;
      }

      const ghData = await ghResponse.json();
      const rawIssues = ghData.items || [];

      for (const issue of rawIssues) {
        const issueId = String(issue.id);

        // Deduplication & Self-Healing Check
        const checkExisting = await docClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: { issueId }
        }));

        // SELF-HEALING RULE: Skip ONLY if we have already posted a live claim comment.
        // This allows us to re-evaluate previously ignored/failed tasks when updating AI engine rules!
        if (checkExisting.Item && checkExisting.Item.status === 'AUTOMATICALLY_CLAIMED') {
          continue;
        }

        const prompt = `You are a professional software engineer looking to contribute to an open-source project.
        Analyze the following GitHub issue title and perform the tasks:

        Issue Title: "${issue.title}"
        
        Task 1: Classify this issue title into exactly one of these categories: "UI/UX", "Server", "CLI", "Security", "Documentation", or "Other".
        - "UI/UX" for frontend changes, CSS, React, UI elements, layouts, or state hooks.
        - "Server" for backend changes, databases, API schemas, validation, backend architecture, Go, or Python.
        - "CLI" for command-line tools (e.g. mesheryctl, flags, config commands).
        - "Security" for authorization, credentials, leaks.
        - "Documentation" for markdown files, guides, tutorials.

        Task 2: Determine if this is a good match for your skills. Set "isGoodMatch" to true ONLY if the category is "UI/UX", "Server", or "CLI". Otherwise set it to false.

        Task 3: Draft a brief, professional, and genuinely human-sounding 2-sentence comment offering to resolve this issue.
        - DO NOT use generic robotic phrases (e.g., "Hello, I am a bot", "GitClaim here", "Ready to assist").
        - Make it sound like a passionate human contributor who understands the problem. Refer to specific files or components mentioned in the title (like RJSF_wrapper.tsx or useNotification).
        - Ask politely to be assigned to the task.`;

        let aiAnalysis = { category: 'Other', isGoodMatch: false, proposal: '' };

        try {
          const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              // Strict schema configuration prevents validation mismatch errors
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  category: { type: 'STRING' },
                  isGoodMatch: { type: 'BOOLEAN' },
                  proposal: { type: 'STRING' }
                },
                required: ['category', 'isGoodMatch', 'proposal']
              }
            }
          });

          if (aiResponse.text) {
            aiAnalysis = JSON.parse(aiResponse.text.trim());
          }
        } catch (aiError) {
          console.error(`Gemini SDK evaluation failed for issue: ${issueId}`, aiError);
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