
// src/app/api/build-family-tree/route.ts
import { NextResponse, type NextRequest } from 'next/server';
// We still need the InputSchema for validating the request to this API route,
// and the Output type for typing the expected response from the external service.
import { BuildFamilyTreeInputSchema, type BuildFamilyTreeOutput } from '@/ai/flows/build-family-tree';
import { ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';

// Placeholder URL for where your Genkit flow would be deployed as a microservice
// e.g., a Google Cloud Function URL.
const FAMILY_TREE_MICROSERVICE_URL = process.env.FAMILY_TREE_MICROSERVICE_URL || 'http://localhost:3400/flows/buildFamilyTreeFlow'; // Genkit default local flow server URL for example

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
    
    // Example of checking for a custom claim.
    // Ensure your test user has this claim or comment this block for initial testing.
    // if (!decodedToken.canManageFamilyTree) {
    //   console.warn(`User ${userId} attempted to manage family tree without 'canManageFamilyTree' claim.`);
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage family trees.' }, { status: 403 });
    // }

  } catch (error) {
    console.error('Error verifying ID token or checking claims:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token or claim issue.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = BuildFamilyTreeInputSchema.parse(requestBody);
    
    // Instead of calling the flow directly:
    // const result: BuildFamilyTreeOutput = await buildFamilyTree(validatedInput);
    // We now call it as an external microservice via HTTP
    
    console.log(`Calling family tree microservice at: ${FAMILY_TREE_MICROSERVICE_URL}`);
    const microserviceResponse = await fetch(FAMILY_TREE_MICROSERVICE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // If the microservice itself is protected by Firebase Auth (e.g., Cloud Function with auth),
            // you might pass the ID token or use a service account for server-to-server auth.
            // 'Authorization': `Bearer ${idToken}`, // Example: Forwarding user token
        },
        body: JSON.stringify({ data: validatedInput }), // Genkit flow server expects {data: input}
    });

    if (!microserviceResponse.ok) {
        const errorBody = await microserviceResponse.text();
        console.error('Error from family tree microservice:', microserviceResponse.status, errorBody);
        throw new Error(`Family tree microservice failed with status ${microserviceResponse.status}: ${errorBody}`);
    }

    // Genkit flow server wraps output in {result: output}
    const responseData = await microserviceResponse.json();
    const result: BuildFamilyTreeOutput = responseData.result;


    if (!result) {
        throw new Error('Invalid response structure from family tree microservice.');
    }

    // Persist to Firestore
    try {
      const familyTreeDocRef = firestoreAdmin.collection('familyTrees').doc();
      await familyTreeDocRef.set({
        treeId: familyTreeDocRef.id,
        userId: userId, // User who initiated this
        clanId: decodedToken.clanId || null, // Example: if clanId is part of custom claims
        familyDataInput: validatedInput.familyData,
        generatedTree: result.familyTree,
        createdAt: firestoreAdmin.FieldValue.serverTimestamp(),
        updatedAt: firestoreAdmin.FieldValue.serverTimestamp(),
      });
    } catch (dbError) {
      console.error('Error saving to Firestore:', dbError);
      // For now, log it and proceed to return the AI result, but you might want to handle this more robustly.
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error in buildFamilyTree API:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

