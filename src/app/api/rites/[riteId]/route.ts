
// src/app/api/rites/[riteId]/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { riteId: string } }
) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token format.' }, { status: 401 });
  }
  const idToken = authorization.split('Bearer ')[1];
  const { riteId } = params;

  if (!riteId) {
    return NextResponse.json({ error: 'riteId parameter is required.' }, { status: 400 });
  }

  let userId: string;
  let decodedToken;
  try {
    decodedToken = await authAdmin.verifyIdToken(idToken);
    userId = decodedToken.uid;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const riteDoc = await firestoreAdmin.collection('rites').doc(riteId).get();

    if (!riteDoc.exists) {
      return NextResponse.json({ error: 'Rite not found.' }, { status: 404 });
    }

    const riteData = riteDoc.data();

    // TODO: Implement fine-grained access control.
    // e.g., user can access if it's their rite, or if they are an elder of the rite's clan.
    // For now, authenticated users can fetch any rite if they know the ID.
    // This MUST be secured with Firestore rules.
    // if (riteData.userId !== userId && !decodedToken.isElderOfClan[riteData.clanId]) {
    //   return NextResponse.json({ error: 'Forbidden: You do not have permission to view this rite.' }, { status: 403 });
    // }

    return NextResponse.json({ id: riteDoc.id, ...riteData }, { status: 200 });
  } catch (error) {
    console.error(`Error fetching rite ${riteId}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT and DELETE handlers would go here.
// They would also need ID token verification and permission checks.
// For PUT, validate request body. For DELETE, simply remove the doc.
// Both should also update the `updatedAt` timestamp.
