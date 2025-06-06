
// src/app/api/suggest-resolution-paths/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { suggestResolutionPaths, type SuggestResolutionPathsInput, type SuggestResolutionPathsOutput } from '@/ai/flows/suggest-resolution-paths';
import { z, ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';

// Define a new, richer schema for the API request body, based on disputes.json
const ApiDisputeSubmissionSchema = z.object({
  clanId: z.string().min(1, "Clan ID is required."),
  involvedParties: z.array(z.string()).min(1, "At least one involved party is required."),
  disputeType: z.string().min(3, 'Dispute type is required.'),
  description: z.string().min(10, 'A description of the dispute is required.'),
  testimonies: z.array(
    z.object({
      by: z.string().min(1, "UID of the member providing testimony is required."),
      text: z.string().min(5, "Testimony text must be at least 5 characters."),
    })
  ).min(1, "At least one testimony is required."),
  ethicsRules: z.string().min(10, 'Ethics rules (JSON format) are required.').refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: "Ethics rules must be valid JSON." }),
});

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
    const validatedApiInput = ApiDisputeSubmissionSchema.parse(requestBody);
    
    // Adapt rich API input to the simpler input expected by the Genkit flow
    const flowInput: SuggestResolutionPathsInput = {
      testimonies: validatedApiInput.testimonies.map(t => `${t.by}: ${t.text}`), // Format testimonies for the flow
      disputeType: validatedApiInput.disputeType,
      ethicsRules: validatedApiInput.ethicsRules,
    };
    
    const result: SuggestResolutionPathsOutput = await suggestResolutionPaths(flowInput);

    // Persist to Firestore 'disputes' collection, aligning with disputes.json schema
    const newDisputeRef = firestoreAdmin.collection('disputes').doc(); // Auto-generate ID
    const timestamp = firestoreAdmin.FieldValue.serverTimestamp();

    await newDisputeRef.set({
      // dispute_id is the document ID (newDisputeRef.id)
      clanId: validatedApiInput.clanId,
      status: "open", // Default status for new disputes
      submittedBy: userId,
      involvedParties: validatedApiInput.involvedParties,
      type: validatedApiInput.disputeType,
      description: validatedApiInput.description,
      testimonies: validatedApiInput.testimonies, // Store the rich testimony objects
      ethicsRulesInput: validatedApiInput.ethicsRules, // Store the JSON string used by the agent
      // Store the agent's output. For now, it's an array of strings.
      // This could be expanded later if the agent's output becomes richer.
      agentSuggestions: {
         resolutionPaths: result.resolutionPaths,
         generatedAt: timestamp, // Timestamp of when suggestions were generated
      },
      // 'agent_simulations' from your schema might be populated by other agents or a more complex flow.
      // For now, we store the direct output of this agent.
      resolved: false, // Default for new disputes
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    
    // Return the agent's output along with the ID of the newly created dispute document
    return NextResponse.json({ disputeId: newDisputeRef.id, ...result }, { status: 200 });

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error in suggestResolutionPaths API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
