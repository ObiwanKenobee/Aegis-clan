
// src/app/api/detect-threats/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';
import { detectThreats, DetectThreatsInputSchema, type DetectThreatsOutput } from '@/ai/flows/detect-threats-flow';

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
    // TODO: Add custom claim checks if specific SOC roles are needed for detection requests
    // e.g., if (!decodedToken.canRequestDetection) {
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    // }
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = DetectThreatsInputSchema.parse(requestBody);
    
    const result: DetectThreatsOutput = await detectThreats(validatedInput);

    // Log to agent_logs
    try {
      const logEntryRef = firestoreAdmin.collection('agent_logs').doc();
      await logEntryRef.set({
        log_id: logEntryRef.id,
        agent: "XDRDetectAgent",
        trigger_event: "threatDetectionRequested",
        timestamp: firestoreAdmin.FieldValue.serverTimestamp(),
        decision: `Threat detection analysis performed. Found ${result.detectedThreats.length} potential threats.`,
        context: {
          requested_by_uid: userId,
          // clan_id: decodedToken.clanId || null, // Not relevant for XDR context
          detectionFocus: validatedInput.detectionFocus,
          eventCount: validatedInput.events.length,
        },
        result: { detectedThreats: result.detectedThreats }, 
      });
    } catch (dbError) {
      console.error('Error saving threat detection log to Firestore agent_logs:', dbError);
      // Log error but proceed to return AI result
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input for threat detection', details: error.errors }, { status: 400 });
    }
    console.error('Error in detect-threats API:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
