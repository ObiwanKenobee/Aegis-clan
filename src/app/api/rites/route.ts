
// src/app/api/rites/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z, ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';
import { logRite, LogRiteInputSchema, type LogRiteOutput } from '@/ai/flows/log-rite-flow';

// Schema for creating a new rite, slightly adapted from LogRiteInputSchema for API needs
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
    
    const flowResult = await logRite(validatedApiInput);

    const newRiteRef = firestoreAdmin.collection('rites').doc();
    const serverTimestamp = firestoreAdmin.FieldValue.serverTimestamp();

    const riteDataToStore = {
      ...flowResult.processedInput,
      riteId: newRiteRef.id,
      userId: userId,
      clanId: validatedApiInput.clanId,
      summaryFromAI: flowResult.summary,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
    };
    
    await newRiteRef.set(riteDataToStore);

    // --- Asynchronous Member Update (Conceptual) ---
    // The following member update is critical for data integrity but can make the API response slower
    // if the members collection is large or Firestore latency is high.
    // Ideally, this secondary update should be handled asynchronously.
    //
    // How to make it truly asynchronous for better scalability and resilience:
    // 1. Publish an event: After successfully storing the rite, publish an event to
    //    Google Cloud Pub/Sub (e.g., topic: 'rite-created', message: { riteId: newRiteRef.id, memberId: riteDataToStore.memberId }).
    // 2. Worker Service: A separate Cloud Function (or other worker service) would subscribe to this Pub/Sub topic.
    // 3. Process Event: Upon receiving the event, this worker function would perform the member document update.
    //    This decouples the member update from the initial API request/response lifecycle.
    //    It also allows for retries and dead-lettering if the member update fails.
    //
    // For now, to make the API feel more responsive without full Pub/Sub implementation,
    // we'll execute this as a fire-and-forget promise. This is NOT true asynchronous processing
    // in a separate worker but makes the client not wait for this specific operation.
    // The operation still consumes resources on the current API instance.

    if (riteDataToStore.memberId) {
      updateMemberRitesCompleted(riteDataToStore.memberId, newRiteRef.id, serverTimestamp)
        .then(() => {
          console.log(`Member update initiated for member ${riteDataToStore.memberId} with rite ${newRiteRef.id}`);
        })
        .catch(error => {
          console.error(`Error initiating member update for member ${riteDataToStore.memberId}:`, error);
          // Log this error to your monitoring system. The main rite logging was successful.
        });
    }
    
    return NextResponse.json({ 
      message: "Rite logged successfully. Member update initiated.", 
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

// Helper function for the member update (could be in a separate service/module)
async function updateMemberRitesCompleted(memberId: string, riteId: string, timestamp: FirebaseFirestore.FieldValue) {
  try {
    const memberQuery = await firestoreAdmin.collection('members').where('uid', '==', memberId).limit(1).get();
    if (!memberQuery.empty) {
      const memberDocRef = memberQuery.docs[0].ref;
      await memberDocRef.update({
        rites_completed: firestoreAdmin.FieldValue.arrayUnion(riteId),
        updatedAt: timestamp,
      });
      console.log(`Successfully updated member ${memberId} with rite ${riteId}`);
    } else {
      console.warn(`Member document with uid ${memberId} not found. Could not update rites_completed.`);
    }
  } catch (memberUpdateError) {
    console.error(`Error updating member ${memberId} rites_completed:`, memberUpdateError);
    // In a real async system with Pub/Sub, this error would trigger retries or go to a dead-letter queue.
    // Here, we just log it.
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
    let query: FirebaseFirestore.Query = firestoreAdmin.collection('rites');
    
    // Firestore queries require ordering before applying inequality filters on different fields.
    // For simplicity, we'll add a default order, but complex filtering might need more specific indexing and ordering.
    query = query.orderBy('createdAt', 'desc');

    if (clanId) {
      // TODO: Implement logic to verify user has permission to view rites for this clanId
      query = query.where('clanId', '==', clanId);
    } else if (memberId) {
      query = query.where('memberId', '==', memberId);
    } else {
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

