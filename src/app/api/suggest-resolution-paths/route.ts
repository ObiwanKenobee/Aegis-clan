// src/app/api/suggest-resolution-paths/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { suggestResolutionPaths, SuggestResolutionPathsInputSchema, type SuggestResolutionPathsOutput } from '@/ai/flows/suggest-resolution-paths';
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
    // if (!decodedToken.canMediateDisputes) {
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    // }
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = SuggestResolutionPathsInputSchema.parse(requestBody);
    
    const result: SuggestResolutionPathsOutput = await suggestResolutionPaths(validatedInput);

    // Persist to Firestore
    try {
      await firestoreAdmin.collection('disputeRecords').add({
        userId: userId,
        inputTestimonies: validatedInput.testimonies,
        inputDisputeType: validatedInput.disputeType,
        inputEthicsRules: validatedInput.ethicsRules, // Storing as string, could be parsed if needed
        outputResolutionPaths: result.resolutionPaths,
        createdAt: firestoreAdmin.FieldValue.serverTimestamp(),
      });
    } catch (dbError) {
      console.error('Error saving dispute record to Firestore:', dbError);
      // Log error but proceed to return AI result
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error in suggestResolutionPaths API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
