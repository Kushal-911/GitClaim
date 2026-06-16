import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Initialize AWS DynamoDB Server-side
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export async function GET() {
  try {
    const response = await docClient.send(new ScanCommand({
      TableName: 'gitclaim-issues'
    }));

    // Sort issues by latest creation date
    const sortedIssues = (response.Items || []).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Return response with caching disabled for live-data freshness
    return NextResponse.json(
      { issues: sortedIssues },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error("DynamoDB Scan Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch issues from database", details: error.message },
      { status: 500 }
    );
  }
}