// src/app/api/offer-scriptural-guidance/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { offerScripturalGuidance, OfferScripturalGuidanceInputSchema, type OfferScripturalGuidanceOutput } from '@/ai/flows/offer-scriptural-guidance';
import { ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin'; // Updated import

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token format.' }, { status: 401 });
  }
  const idToken = authorization.split('Bearer ')[1];

  let userId: string;
  try {
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    userId = decodedToken.uid;
    // TODO: Add custom claim checks here if needed for role-based access, e.g.
    // if (!decodedToken.canSeekGuidance) {
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    // }
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = OfferScripturalGuidanceInputSchema.parse(requestBody);
    
    const result: OfferScripturalGuidanceOutput = await offerScripturalGuidance(validatedInput);

    // Persist to Firestore
    try {
      await firestoreAdmin.collection('guidanceLogs').add({
        userId: userId,
        inputDecision: validatedInput.decision,
        inputClanTraditions: validatedInput.clanTraditions,
        outputScripturalReference: result.scripturalReference,
        outputExplanation: result.explanation,
        createdAt: firestoreAdmin.FieldValue.serverTimestamp(),
      });
    } catch (dbError) {
      console.error('Error saving guidance log to Firestore:', dbError);
      // Log error but proceed to return AI result
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error in offerScripturalGuidance API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
