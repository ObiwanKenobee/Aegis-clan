
// src/app/api/interpret-moral-rules/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';
import { interpretMoralRules, InterpretMoralRulesInputSchema, type InterpretMoralRulesOutput } from '@/ai/flows/interpret-moral-rules-flow';

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
    // if (!decodedToken.canRequestInterpretation) { // Example custom claim
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions to request moral rule interpretation.' }, { status: 403 });
    // }
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = InterpretMoralRulesInputSchema.parse(requestBody);
    
    const result: InterpretMoralRulesOutput = await interpretMoralRules(validatedInput);

    // Persist to Firestore 'agent_logs' collection
    try {
      const logEntryRef = firestoreAdmin.collection('agent_logs').doc();
      await logEntryRef.set({
        log_id: logEntryRef.id,
        agent: "CovenantAgent",
        trigger_event: "moralRuleInterpretation",
        timestamp: firestoreAdmin.FieldValue.serverTimestamp(),
        decision: result.overallAssessment, // Or a summary of the recommendation
        context: {
          requested_by_uid: userId,
          clan_id: decodedToken.clanId || null, // Assuming clanId might be a custom claim
          situationDescription: validatedInput.situationDescription,
          moralRulesUsedHash: validatedInput.moralRulesJson.length, // Could hash the rules JSON for brevity if needed
          // Consider storing the full rules if small enough, or a reference if large/versioned
        },
        result: result, // Store the full agent output
        // ethics_reference could be populated from result.pertinentScripturalReferences if needed
      });
    } catch (dbError) {
      console.error('Error saving to Firestore agent_logs:', dbError);
      // Log error but proceed to return AI result
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input for moral rule interpretation', details: error.errors }, { status: 400 });
    }
    console.error('Error in interpretMoralRules API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
