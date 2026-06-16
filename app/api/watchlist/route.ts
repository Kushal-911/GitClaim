import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = 'gitclaim-issues';

// Helper to parse messy repository inputs (handles full URLs and raw owner/repo names)
const parseRepoInput = (input: string) => {
  const cleaned = input.trim().replace(/\/$/, "");
  if (cleaned.includes("github.com/")) {
    const parts = cleaned.split("github.com/");
    return parts[1]; // Extracts "owner/repo"
  }
  return cleaned;
};

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "Repository identifier is required" }, { status: 400 });
    }

    const repoFullName = parseRepoInput(url);
    if (!repoFullName.includes("/")) {
      return NextResponse.json({ error: "Invalid format. Must be 'owner/repo' or a full GitHub URL" }, { status: 400 });
    }

    const watchlistId = `WATCHLIST#${repoFullName}`;

    // Add watchlist descriptor to DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        issueId: watchlistId,
        repoFullName: repoFullName,
        status: 'WATCHLIST_ITEM',
        createdAt: new Date().toISOString()
      }
    }));

    return NextResponse.json({ success: true, repoFullName });
  } catch (error: any) {
    console.error("Watchlist additions error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { repoFullName } = await req.json();
    if (!repoFullName) {
      return NextResponse.json({ error: "Repository identifier is required" }, { status: 400 });
    }

    const watchlistId = `WATCHLIST#${repoFullName}`;

    // Remove the watchlist entry from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { issueId: watchlistId }
    }));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Watchlist removal error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}