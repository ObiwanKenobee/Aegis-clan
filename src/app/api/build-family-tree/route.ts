
// src/app/api/build-family-tree/route.ts
import { NextResponse, type NextRequest } from 'next/server';
// We still need the InputSchema for validating the request to this API route,
// and the Output type for typing the expected response from the external service.
import { BuildFamilyTreeInputSchema, type BuildFamilyTreeOutput } from '@/ai/flows/build-family-tree';
import { ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';

// Placeholder URL for where your Genkit flow would be deployed as a microservice
// e.g., a Google Cloud Function URL. For local testing with `genkit start`,
// flows are often available at http://localhost:3400/flows/<flowName>
const FAMILY_TREE_MICROSERVICE_URL = process.env.FAMILY_TREE_MICROSERVICE_URL || 'http://localhost:3400/flows/buildFamilyTreeFlow';

export async function POST(request: NextRequest) {
  const authorizationHeader = request.headers.get('Authorization');
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid user token format.' }, { status: 401 });
  }
  const idToken = authorizationHeader.split('Bearer ')[1];

  let userId: string;
  let decodedToken;
  try {
    decodedToken = await authAdmin.verifyIdToken(idToken);
    userId = decodedToken.uid;
    
    // Example of checking for a custom claim for user authorization.
    // Ensure your test user has this claim or comment this block for initial testing.
    // if (!decodedToken.canManageFamilyTree) {
    //   console.warn(`User ${userId} attempted to manage family tree without 'canManageFamilyTree' claim.`);
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions to manage family trees.' }, { status: 403 });
    // }

  } catch (error) {
    console.error('Error verifying user ID token or checking claims:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid user token or claim issue.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = BuildFamilyTreeInputSchema.parse(requestBody);
    
    // --- Microservice Call ---
    // When this Next.js backend runs on Google Cloud (e.g., App Hosting, Cloud Run),
    // it uses an underlying service account. To call another Google Cloud service
    // (like a Genkit flow deployed as a Cloud Function) securely, you'd:
    // 1. Grant the Next.js service account IAM permission to invoke the target Cloud Function.
    // 2. Configure the target Cloud Function to require authentication.
    // 3. The Next.js backend would then fetch an OIDC Identity Token for its service account,
    //    scoped to the target Cloud Function's URL. This token is sent in the Authorization header.
    
    // Conceptual: How to get an Identity Token (actual implementation depends on environment)
    // let serviceIdentityToken;
    // if (process.env.GOOGLE_CLOUD_PROJECT) { // Indicates running on GCP
    //   // On GCP, you'd typically use the google-auth-library or metadata server
    //   // to get an identity token for the service account.
    //   // const {GoogleAuth} = require('google-auth-library');
    //   // const auth = new GoogleAuth();
    //   // const client = await auth.getIdTokenClient(FAMILY_TREE_MICROSERVICE_URL);
    //   // const idTokenResponse = await client.getRequestHeaders();
    //   // serviceIdentityToken = idTokenResponse.Authorization.split('Bearer ')[1];
    //   serviceIdentityToken = "CONCEPTUAL_GOOGLE_ID_TOKEN_FOR_SERVICE_ACCOUNT"; // Placeholder
    // }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // if (serviceIdentityToken) {
    //   headers['Authorization'] = `Bearer ${serviceIdentityToken}`;
    //   console.log('Calling family tree microservice with service identity token.');
    // } else {
    //   console.log(`Calling family tree microservice at: ${FAMILY_TREE_MICROSERVICE_URL} (unauthenticated or local)`);
    // }
    console.log(`Calling family tree microservice at: ${FAMILY_TREE_MICROSERVICE_URL}`);


    const microserviceResponse = await fetch(FAMILY_TREE_MICROSERVICE_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ data: validatedInput }), // Genkit flow server expects {data: {input}}
    });

    if (!microserviceResponse.ok) {
        const errorBody = await microserviceResponse.text();
        console.error('Error from family tree microservice:', microserviceResponse.status, errorBody);
        // If the error is 401 or 403, it might be due to the microservice expecting
        // an Identity Token and not receiving a valid one, or the service account lacking permission.
        throw new Error(`Family tree microservice failed with status ${microserviceResponse.status}: ${errorBody}`);
    }

    // Genkit flow server typically wraps output in {result: output}
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
