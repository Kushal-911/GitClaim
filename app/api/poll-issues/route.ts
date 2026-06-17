import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { GoogleGenAI } from '@google/genai';

// FORCE VERCEL TO EXCLUDE THIS ROUTE FROM ALL STATIC CACHING PATHS
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        // Completely bypasses Next.js internal data caches
        cache: 'no-store'
      });

      if (!ghResponse.ok) {
        console.warn(`Failed to poll GitHub repository: ${repo}`);
        continue;
      }

      const ghData = await ghResponse.json();
      const rawIssues = ghData.items || [];

      for (const issue of rawIssues) {
        const issueId = String(issue.id);
        const title = issue.title;

        // Deduplication & Self-Healing Check
        const checkExisting = await docClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: { issueId }
        }));

        if (checkExisting.Item && checkExisting.Item.status === 'AUTOMATICALLY_CLAIMED') {
          continue;
        }

        // --- STEP 1: HYBRID HEURISTIC CLASSIFIER ---
        const upperTitle = title.toUpperCase();
        let finalCategory = 'Other';
        let isGoodMatch = false;
        let heuristicApplied = false;

        if (upperTitle.includes('[UI]') || upperTitle.includes('UI/UX') || upperTitle.includes('FRONTEND') || upperTitle.includes('REACT') || upperTitle.includes('CSS')) {
          finalCategory = 'UI/UX';
          isGoodMatch = true;
          heuristicApplied = true;
        } else if (upperTitle.includes('[SERVER]') || upperTitle.includes('BACKEND') || upperTitle.includes('DATABASE') || upperTitle.includes('API') || upperTitle.includes('SCHEMA')) {
          finalCategory = 'Server';
          isGoodMatch = true;
          heuristicApplied = true;
        } else if (upperTitle.includes('[CLI]') || upperTitle.includes('[MESHERYCTL]') || upperTitle.includes('COMMAND LINE')) {
          finalCategory = 'CLI';
          isGoodMatch = true;
          heuristicApplied = true;
        } else if (upperTitle.includes('[SECURITY]') || upperTitle.includes('SECRET') || upperTitle.includes('AUTH')) {
          finalCategory = 'Security';
          isGoodMatch = false;
          heuristicApplied = true;
        } else if (upperTitle.includes('[DOCS]') || upperTitle.includes('DOCUMENTATION') || upperTitle.includes('README.MD')) {
          finalCategory = 'Documentation';
          isGoodMatch = false;
          heuristicApplied = true;
        }

        // --- STEP 2: AI TAILORED PROPOSAL GENERATION ---
        const prompt = `You are a professional software engineer looking to contribute to an open-source project.
        Analyze the following GitHub issue title and perform the tasks:

        Issue Title: "${title}"
        
        Task 1: Classify this issue title into exactly one of these categories: "UI/UX", "Server", "CLI", "Security", "Documentation", or "Other".
        - "UI/UX" for frontend changes, CSS, React, UI elements, layouts, or state hooks.
        - "Server" for backend changes, databases, API schemas, validation, backend architecture, Go, or Python.
        - "CLI" for command-line tools (e.g. mesheryctl, flags, config commands).
        - "Security" for authorization, credentials, leaks.
        - "Documentation" for markdown files, guides, tutorials.

        Task 2: Determine if this is a good match for your skills. Set "isGoodMatch" to true ONLY if the category is "UI/UX", "Server", or "CLI". Otherwise set it to false.

        Task 3: Draft a brief, professional, and genuinely human-sounding 2-sentence comment offering to resolve this issue.
        - DO NOT use generic robotic phrases (e.g., "Hello, I am a bot", "GitClaim here").
        - Make it sound like a passionate human contributor who understands the problem. Refer to specific files or components mentioned in the title.
        - Ask politely to be assigned to the task.`;

        let aiAnalysis = { category: 'Other', isGoodMatch: false, proposal: '' };

        try {
          const aiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  category: { 
                    type: 'STRING',
                    enum: ["UI/UX", "Server", "CLI", "Security", "Documentation", "Other"]
                  },
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
          console.error(`Gemini SDK processing failed for issue: ${issueId}. Falling back to heuristic defaults.`, aiError);
        }

        if (heuristicApplied) {
          aiAnalysis.category = finalCategory;
          aiAnalysis.isGoodMatch = isGoodMatch;
        }

        if (!aiAnalysis.proposal) {
          aiAnalysis.proposal = `Hi team! I noticed this issue regarding the ${aiAnalysis.category} category. I am highly interested in working on this and would love to help resolve it.`;
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
          title,
          status: runStatus,
          category: aiAnalysis.category,
          isGoodMatch: aiAnalysis.isGoodMatch,
          aiProposal: postedCommentText || aiAnalysis.proposal,
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