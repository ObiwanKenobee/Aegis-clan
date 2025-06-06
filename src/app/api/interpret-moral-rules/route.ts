
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
    // Example custom claim check
    // if (!decodedToken.canRequestInterpretation) { 
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 });
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
      // Simple hash for moral rules for logging, or consider storing a version/ID if rules are versioned
      const moralRulesHash = validatedInput.moralRulesJson.length + validatedInput.moralRulesJson.substring(0,20);

      await logEntryRef.set({
        log_id: logEntryRef.id,
        agent: "CovenantAgent",
        trigger_event: "moralRuleInterpretationRequested",
        timestamp: firestoreAdmin.FieldValue.serverTimestamp(),
        decision: result.overallAssessment, 
        context: {
          requested_by_uid: userId,
          clan_id: decodedToken.clanId || null, 
          situationDescription: validatedInput.situationDescription,
          moralRulesHash: moralRulesHash,
          clanContext: validatedInput.clanContext,
        },
        result: result, // Store the full agent output, which matches InterpretMoralRulesOutputSchema
        ethics_reference: result.pertinentScripturalReferences && result.pertinentScripturalReferences.length > 0 
                          ? result.pertinentScripturalReferences.join(', ') 
                          : null,
      });
    } catch (dbError) {
      console.error('Error saving moral interpretation log to Firestore agent_logs:', dbError);
      // Log error but proceed to return AI result
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input for moral rule interpretation', details: error.errors }, { status: 400 });
    }
    console.error('Error in interpretMoralRules API:', error);
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
