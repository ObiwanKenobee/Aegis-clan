// src/app/api/build-family-tree/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { buildFamilyTree, BuildFamilyTreeInputSchema, type BuildFamilyTreeOutput } from '@/ai/flows/build-family-tree';
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
    // if (!decodedToken.canManageFamilyTree) {
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    // }
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = BuildFamilyTreeInputSchema.parse(requestBody);
    
    const result: BuildFamilyTreeOutput = await buildFamilyTree(validatedInput);

    // Persist to Firestore
    try {
      await firestoreAdmin.collection('familyTrees').add({
        userId: userId,
        familyDataInput: validatedInput.familyData,
        generatedTree: result.familyTree,
        createdAt: firestoreAdmin.FieldValue.serverTimestamp(), // Ensure firestoreAdmin is used
      });
    } catch (dbError) {
      console.error('Error saving to Firestore:', dbError);
      // Decide if this should be a fatal error for the API response or just logged
      // For now, we'll log it and proceed to return the AI result
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error in buildFamilyTree API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
