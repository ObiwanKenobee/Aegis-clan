
// src/app/api/rites/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z, ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';
import { logRite, LogRiteInputSchema, type LogRiteOutput } from '@/ai/flows/log-rite-flow';

// Schema for creating a new rite, slightly adapted from LogRiteInputSchema for API needs
// For example, clanId might be derived or enforced differently at API level.
const CreateRiteApiSchema = LogRiteInputSchema.extend({
  clanId: z.string().min(1, "Clan ID is required to associate the rite.")
});


export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token format.' }, { status: 401 });
  }
  const idToken = authorization.split('Bearer ')[1];

  let userId: string;
  let decodedToken;
  try {
    decodedToken = await authAdmin.verifyIdToken(idToken);
    userId = decodedToken.uid;
    // TODO: Add custom claim checks here if needed, e.g.,
    // if (!decodedToken.canLogRites) {
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions to log rites' }, { status: 403 });
    // }
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedApiInput = CreateRiteApiSchema.parse(requestBody);
    
    // Call the Genkit flow to process rite data
    const flowResult = await logRite(validatedApiInput);

    // Persist to Firestore 'rites' collection
    const newRiteRef = firestoreAdmin.collection('rites').doc(); // Auto-generate ID
    const serverTimestamp = firestoreAdmin.FieldValue.serverTimestamp();

    const riteDataToStore = {
      ...flowResult.processedInput, // Contains original input + AI processed fields like isoDate
      riteId: newRiteRef.id, // Store the Firestore-generated ID
      userId: userId, // User who logged the rite
      clanId: validatedApiInput.clanId, // Ensure clanId is stored
      summaryFromAI: flowResult.summary,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
    };
    
    await newRiteRef.set(riteDataToStore);

    // After successfully logging the rite, attempt to update the member's rites_completed list
    if (riteDataToStore.memberId) {
      try {
        const memberQuery = await firestoreAdmin.collection('members').where('uid', '==', riteDataToStore.memberId).limit(1).get();
        if (!memberQuery.empty) {
          const memberDocRef = memberQuery.docs[0].ref;
          await memberDocRef.update({
            rites_completed: firestoreAdmin.FieldValue.arrayUnion(newRiteRef.id),
            updatedAt: serverTimestamp, // Also update member's updatedAt timestamp
          });
          console.log(`Successfully updated member ${riteDataToStore.memberId} with rite ${newRiteRef.id}`);
        } else {
          console.warn(`Member document with uid ${riteDataToStore.memberId} not found. Could not update rites_completed.`);
        }
      } catch (memberUpdateError) {
        console.error(`Error updating member ${riteDataToStore.memberId} rites_completed:`, memberUpdateError);
        // Do not fail the main rite logging for this, but log the error.
      }
    }
    
    return NextResponse.json({ 
      message: "Rite logged successfully", 
      riteId: newRiteRef.id, 
      details: riteDataToStore 
    }, { status: 201 });

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input for rite', details: error.errors }, { status: 400 });
    }
    console.error('Error in POST /api/rites:', error);
    return NextResponse.json({ error: 'Internal Server Error while logging rite' }, { status: 500 });
  }
}


export async function GET(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token format.' }, { status: 401 });
  }
  const idToken = authorization.split('Bearer ')[1];

  let userId: string;
  let decodedToken;
  try {
    decodedToken = await authAdmin.verifyIdToken(idToken);
    userId = decodedToken.uid;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clanId = searchParams.get('clanId');
  const memberId = searchParams.get('memberId');

  try {
    let query = firestoreAdmin.collection('rites').orderBy('createdAt', 'desc');

    // Example: Allow fetching rites based on clanId or memberId if provided
    // For more complex role-based access (e.g. elder sees all clan rites), custom claims would be checked
    if (clanId) {
      // TODO: Implement logic to verify user has permission to view rites for this clanId
      // e.g., by checking if userId is a member or elder of clanId
      query = query.where('clanId', '==', clanId);
    } else if (memberId) {
       // Users can generally see rites associated with their own memberId (if they are that member)
       // or if they are an elder of the clan the member belongs to.
       // For simplicity, let's assume for now user can query for any memberId if they are authenticated.
       // Proper security rules in Firestore are critical here.
      query = query.where('memberId', '==', memberId);
    } else {
      // Default to fetching rites logged by the current user if no other params
      query = query.where('userId', '==', userId);
    }
    
    const snapshot = await query.get();
    if (snapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const rites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(rites, { status: 200 });

  } catch (error) {
    console.error('Error in GET /api/rites:', error);
    return NextResponse.json({ error: 'Internal Server Error while fetching rites' }, { status: 500 });
  }
}
