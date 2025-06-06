
// src/app/api/rites/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z, ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';
import { logRite, LogRiteInputSchema, type ProcessedRiteData } from '@/ai/flows/log-rite-flow'; // Updated import

// Schema for creating a new rite via the API. Includes clanId.
const CreateRiteApiInputSchema = LogRiteInputSchema.extend({
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
    // if (!decodedToken.canLogRitesForClan[validatedApiInput.clanId]) {
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions to log rites for this clan.' }, { status: 403 });
    // }
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    // Validate the full API input including clanId
    const validatedApiInput = CreateRiteApiInputSchema.parse(requestBody);
    
    // Prepare input for the Genkit flow (which doesn't need clanId directly for its processing)
    const flowInput: z.infer<typeof LogRiteInputSchema> = {
        memberId: validatedApiInput.memberId,
        type: validatedApiInput.type,
        date: validatedApiInput.date,
        officiant: validatedApiInput.officiant,
        audioArchiveUrl: validatedApiInput.audioArchiveUrl,
        notes: validatedApiInput.notes,
        blessingScripture: validatedApiInput.blessingScripture,
    };

    const flowResult: ProcessedRiteData = await logRite(flowInput);

    const newRiteRef = firestoreAdmin.collection('rites').doc();
    const serverTimestamp = firestoreAdmin.FieldValue.serverTimestamp();

    const riteDataToStore = {
      riteId: newRiteRef.id,
      userId: userId, // User who logged this rite
      clanId: validatedApiInput.clanId, // Store the clanId from API input
      memberId: flowResult.originalInput.memberId,
      type: flowResult.originalInput.type,
      date: flowResult.isoDate, // Use ISO date from flow
      officiant: flowResult.originalInput.officiant,
      audioArchiveUrl: flowResult.originalInput.audioArchiveUrl,
      notes: flowResult.originalInput.notes,
      blessingScripture: flowResult.originalInput.blessingScripture,
      summaryFromAI: flowResult.summary, // Summary from AI
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
    };
    
    await newRiteRef.set(riteDataToStore);

    // Asynchronous Member Update (fire-and-forget)
    if (riteDataToStore.memberId) {
      updateMemberRitesCompleted(riteDataToStore.memberId, riteDataToStore.clanId, newRiteRef.id, serverTimestamp)
        .then(() => {
          console.log(`Member update initiated for member ${riteDataToStore.memberId} in clan ${riteDataToStore.clanId} with rite ${newRiteRef.id}`);
        })
        .catch(error => {
          console.error(`Error initiating member update for member ${riteDataToStore.memberId}:`, error);
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
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while logging rite' }, { status: 500 });
  }
}

async function updateMemberRitesCompleted(memberId: string, clanId: string, riteId: string, timestamp: FirebaseFirestore.FieldValue) {
  try {
    // Query for member within a specific clan for better targeting if your 'members' collection is large
    // and members might have non-unique UIDs across clans (though uids should ideally be globally unique).
    // If memberId (uid) is globally unique, clanId in query isn't strictly needed but can act as a safeguard.
    const memberQuery = await firestoreAdmin.collection('members')
                                        .where('uid', '==', memberId)
                                        .where('clanId', '==', clanId) // Ensure updating member in correct clan
                                        .limit(1)
                                        .get();
    if (!memberQuery.empty) {
      const memberDocRef = memberQuery.docs[0].ref;
      await memberDocRef.update({
        rites_completed: firestoreAdmin.FieldValue.arrayUnion(riteId),
        updatedAt: timestamp,
      });
      console.log(`Successfully updated member ${memberId} (clan: ${clanId}) with rite ${riteId}`);
    } else {
      console.warn(`Member document with uid ${memberId} in clan ${clanId} not found. Could not update rites_completed.`);
    }
  } catch (memberUpdateError) {
    console.error(`Error updating member ${memberId} (clan: ${clanId}) rites_completed:`, memberUpdateError);
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
    
    query = query.orderBy('createdAt', 'desc');

    if (clanId) {
      // TODO: Implement logic to verify user has permission to view rites for this clanId
      // e.g. if (decodedToken.memberOfClans?.includes(clanId) || decodedToken.admin)
      query = query.where('clanId', '==', clanId);
    } else if (memberId) {
       // TODO: Implement logic to verify user has permission to view rites for this memberId
       // e.g. if (decodedToken.uid === memberId || decodedToken.admin)
      query = query.where('memberId', '==', memberId);
    } else {
      // Default to rites logged by the authenticated user if no other filters
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
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error while fetching rites' }, { status: 500 });
  }
}
