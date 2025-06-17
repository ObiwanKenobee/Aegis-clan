
// src/app/api/mongodb-members-example/route.ts
import { NextResponse, type NextRequest } from 'next/server';
// We keep getDb and mongoClientPromise here, as they *could* be used by
// a Python service if it were co-located or if other Node.js modules needed direct access.
// However, this specific API route will now simulate calling an external Python service.
// import { getDb } from '@/lib/mongodb';

// This would be an environment variable pointing to your deployed Python member service
const PYTHON_MEMBER_SERVICE_URL = process.env.PYTHON_MEMBER_SERVICE_URL || 'http://localhost:5001/api/get-clan-members'; // Example Python service URL

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clanId = searchParams.get('clan_id');

  if (!clanId) {
    return NextResponse.json({ error: "Missing 'clan_id' query parameter." }, { status: 400 });
  }

  try {
    // Construct the URL for the Python service, passing clan_id as a query parameter
    const serviceUrl = new URL(PYTHON_MEMBER_SERVICE_URL);
    serviceUrl.searchParams.append('clan_id', clanId);
    // In a real scenario, you'd also pass a limit if needed, e.g., serviceUrl.searchParams.append('limit', '5');

    console.log(`Calling Python member service at: ${serviceUrl.toString()}`);

    // In a real microservice architecture, you would secure this call.
    // For example, if both services are on Google Cloud, the Next.js service (caller)
    // would use its service account to get an OIDC Identity Token and send it in the
    // Authorization header. The Python service (callee) would be configured in IAM
    // to require authentication and validate this token.
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      // Conceptual: 'Authorization': `Bearer <SERVICE_ACCOUNT_IDENTITY_TOKEN>`
    };

    const pythonServiceResponse = await fetch(serviceUrl.toString(), {
      method: 'GET', // Assuming the Python service exposes a GET endpoint for this
      headers: headers,
    });

    if (!pythonServiceResponse.ok) {
      const errorBody = await pythonServiceResponse.text();
      console.error('Error from Python member service:', pythonServiceResponse.status, errorBody);
      throw new Error(`Python member service failed with status ${pythonServiceResponse.status}: ${errorBody}`);
    }

    const membersData = await pythonServiceResponse.json();

    // The Python service would return data similar to what your Python script produces.
    // For example: { message: "Found X members...", members: [...] }
    // We assume the 'members' key in the response contains the array of member objects.

    if (!membersData || !Array.isArray(membersData.members)) {
      // Handle cases where the Python service response might not be as expected.
      // Or if the Python service itself sends a 404-like response in its body.
      if (membersData && membersData.message && membersData.members?.length === 0) {
         return NextResponse.json({ message: membersData.message, members: [] }, { status: 200 });
      }
      return NextResponse.json({ message: `No members found or unexpected response from Python service for clan_id: ${clanId}.` }, { status: 404 });
    }
    
    return NextResponse.json({
      message: membersData.message || `Successfully fetched members from Python service for clan_id: ${clanId}`,
      members: membersData.members,
    }, { status: 200 });

  } catch (error) {
    console.error(`Error calling Python member service for clan_id ${clanId}:`, error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    // This specific check for MONGODB_URI might not be relevant here if this route *only* calls Python.
    // However, if there was a fallback or other direct DB logic, it could be.
    // if (errorMessage.includes('MONGODB_URI is not configured')) {
    //     return NextResponse.json({ error: 'MongoDB (via Python service) not configured.' }, { status: 503 });
    // }
    return NextResponse.json({ error: `Failed to fetch members via Python service for clan_id ${clanId}`, details: errorMessage }, { status: 500 });
  }
}
