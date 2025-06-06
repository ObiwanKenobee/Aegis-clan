
// src/app/api/language-info/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';
import { provideLanguageContext, LanguageContextInputSchema, type LanguageContextOutput } from '@/ai/flows/provide-language-context-flow';

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
    // TODO: Add custom claim checks if specific roles are needed for this functionality
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = LanguageContextInputSchema.parse(requestBody);
    
    const result: LanguageContextOutput = await provideLanguageContext(validatedInput);

    // Log to agent_logs
    try {
      const logEntryRef = firestoreAdmin.collection('agent_logs').doc();
      await logEntryRef.set({
        log_id: logEntryRef.id,
        agent: "LanguageContextAgent",
        trigger_event: "languageInfoRequested",
        timestamp: firestoreAdmin.FieldValue.serverTimestamp(),
        decision: `Information provided for topic: "${validatedInput.topic.substring(0, 50)}..."`,
        context: {
          requested_by_uid: userId,
          clan_id: decodedToken.clanId || null, // Assuming clanId might be in token
          topic: validatedInput.topic,
          clanLanguageContext: validatedInput.clanLanguageContext,
        },
        result: { information: result.information }, 
      });
    } catch (dbError) {
      console.error('Error saving language context log to Firestore agent_logs:', dbError);
      // Log error but proceed to return AI result
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input for language context', details: error.errors }, { status: 400 });
    }
    console.error('Error in language-info API:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
