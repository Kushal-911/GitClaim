import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const TABLE_NAME = 'gitclaim-issues';

export async function GET() {
  try {
    const response = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME
    }));

    const items = response.Items || [];

    // Separate Watchlists from Issues in Javascript memory (Zero complex index requirements)
    const watchlist = items.filter(i => i.status === 'WATCHLIST_ITEM');
    const issues = items
      .filter(i => i.status !== 'WATCHLIST_ITEM')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(
      { issues, watchlist },
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
      { error: "Failed to fetch data from database", details: error.message },
      { status: 500 }
    );
  }
}