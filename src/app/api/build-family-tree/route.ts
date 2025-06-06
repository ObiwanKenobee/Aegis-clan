
// src/app/api/build-family-tree/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { buildFamilyTree, BuildFamilyTreeInputSchema, type BuildFamilyTreeOutput } from '@/ai/flows/build-family-tree';
import { ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token format.' }, { status: 401 });
  }
  const idToken = authorization.split('Bearer ')[1];

  let userId: string;
  let decodedToken; // Make decodedToken available in the broader scope
  try {
    decodedToken = await authAdmin.verifyIdToken(idToken);
    userId = decodedToken.uid;
    
    // Example of checking for a custom claim
    // You would set this claim on the user via a trusted backend process (e.g., a Cloud Function)
    // For example: await authAdmin.setCustomUserClaims(userId, { canManageFamilyTree: true });
    if (!decodedToken.canManageFamilyTree) { // Check for the custom claim
      // To make this work, you'd need to set this custom claim on users who should have this permission.
      // For testing, you might temporarily bypass this or ensure your test user has the claim.
      // console.warn(`User ${userId} attempted to manage family tree without 'canManageFamilyTree' claim.`);
      // return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage family trees.' }, { status: 403 });
    }

  } catch (error) {
    console.error('Error verifying ID token or checking claims:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token or claim issue.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = BuildFamilyTreeInputSchema.parse(requestBody);
    
    const result: BuildFamilyTreeOutput = await buildFamilyTree(validatedInput);

    // Persist to Firestore
    try {
      await firestoreAdmin.collection('familyTrees').add({
        userId: userId, // User who initiated this
        clanId: decodedToken.clanId || null, // Example: if clanId is part of custom claims
        familyDataInput: validatedInput.familyData,
        generatedTree: result.familyTree,
        createdAt: firestoreAdmin.FieldValue.serverTimestamp(),
      });
    } catch (dbError) {
      console.error('Error saving to Firestore:', dbError);
      // For now, log it and proceed to return the AI result
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
