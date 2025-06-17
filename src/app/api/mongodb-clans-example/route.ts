
// src/app/api/mongodb-clans-example/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/lib/mongodb'; // Assuming your MongoDB utility is here

const DB_NAME = "clan_chain"; // As per your Python example
const COLLECTION_NAME = "clans";

export async function GET(request: NextRequest) {
  try {
    const db = await getDb(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Similar to: atlas_client.find(collection_name="clans", limit=5)
    // We'll fetch all for this example, but you can add .limit(5)
    const clans = await collection.find({}).limit(5).toArray();

    if (!clans) {
      return NextResponse.json({ message: "No clans found or error fetching clans." }, { status: 404 });
    }

    // You might want to map over the clans to transform the _id or other fields if needed
    const formattedClans = clans.map(clan => ({
      id: clan._id.toString(), // Convert ObjectId to string
      name: clan.name,
      region: clan.region,
      elders: clan.elders,
      // Add other fields as needed, matching your clan schema
    }));

    return NextResponse.json({
      message: `Found ${formattedClans.length} clans`,
      clans: formattedClans,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching clans from MongoDB:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // Check for specific MongoDB connection errors if necessary
    if (errorMessage.includes('MONGODB_URI is not configured')) {
        return NextResponse.json({ error: 'MongoDB not configured. Please set MONGODB_URI.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Failed to fetch clans from MongoDB', details: errorMessage }, { status: 500 });
  }
}
