
// src/app/api/mongodb-members-example/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb'; // Assuming your MongoDB utility is here

const DB_NAME = "clan_chain";
const COLLECTION_NAME = "members";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clanId = searchParams.get('clan_id'); // Get clan_id from query parameters

  if (!clanId) {
    return NextResponse.json({ error: "Missing 'clan_id' query parameter." }, { status: 400 });
  }

  try {
    const db = await getDb(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Filter for members of the specified clan_id
    const members = await collection.find({ clan_id: clanId }).limit(10).toArray(); // Limit to 10 for this example

    if (!members || members.length === 0) {
      return NextResponse.json({ message: `No members found for clan_id: ${clanId}.` }, { status: 404 });
    }

    const formattedMembers = members.map(member => ({
      id: member._id.toString(), // Convert ObjectId to string
      name: member.name,
      role: member.role,
      lineage: member.lineage,
      current_status: member.current_status,
      // Add other fields as needed, matching your member schema
    }));

    return NextResponse.json({
      message: `Found ${formattedMembers.length} members for clan_id: ${clanId}`,
      members: formattedMembers,
    }, { status: 200 });

  } catch (error) {
    console.error(`Error fetching members for clan_id ${clanId} from MongoDB:`, error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    if (errorMessage.includes('MONGODB_URI is not configured')) {
        return NextResponse.json({ error: 'MongoDB not configured. Please set MONGODB_URI.' }, { status: 503 });
    }
    return NextResponse.json({ error: `Failed to fetch members from MongoDB for clan_id ${clanId}`, details: errorMessage }, { status: 500 });
  }
}
