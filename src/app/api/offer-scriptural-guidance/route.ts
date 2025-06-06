// src/app/api/offer-scriptural-guidance/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { offerScripturalGuidance, OfferScripturalGuidanceInputSchema, type OfferScripturalGuidanceOutput } from '@/ai/flows/offer-scriptural-guidance';
import { ZodError } from 'zod';
import { authAdmin } from '@/lib/firebase/admin'; // Import authAdmin

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token format.' }, { status: 401 });
  }
  const idToken = authorization.split('Bearer ')[1];

  let userId: string; // Or decodedToken if more info is needed later
  try {
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    userId = decodedToken.uid;
    // TODO: Add custom claim checks here if needed, e.g.
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

    // TODO: Consider persisting input, output, and userId to Firestore here if needed.
    // e.g., await firestoreAdmin.collection('guidanceLogs').add({ userId, input: validatedInput, ... });
    
    const result: OfferScripturalGuidanceOutput = await offerScripturalGuidance(validatedInput);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error in offerScripturalGuidance API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
