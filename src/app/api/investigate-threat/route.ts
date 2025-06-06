
// src/app/api/investigate-threat/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';
import { investigateThreat, InvestigateThreatInputSchema, type InvestigateThreatOutput } from '@/ai/flows/investigate-threat-flow';

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
    // TODO: Add custom claim checks if specific SOC roles are needed
    // e.g., if (!decodedToken.canInvestigateThreats) {
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    // }
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = InvestigateThreatInputSchema.parse(requestBody);
    
    const result: InvestigateThreatOutput = await investigateThreat(validatedInput);

    // Log to agent_logs
    try {
      const logEntryRef = firestoreAdmin.collection('agent_logs').doc();
      await logEntryRef.set({
        log_id: logEntryRef.id,
        agent: "XDRInvestigateAgent",
        trigger_event: "threatInvestigationRequested",
        timestamp: firestoreAdmin.FieldValue.serverTimestamp(),
        decision: `Investigation summary for threat ${result.threatId}: ${result.summary.substring(0, 100)}...`,
        context: {
          requested_by_uid: userId,
          threatId: validatedInput.threatId,
          threatDescription: validatedInput.threatDescription,
          investigationScope: validatedInput.investigationScope,
        },
        result: result, 
      });
    } catch (dbError) {
      console.error('Error saving threat investigation log to Firestore agent_logs:', dbError);
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input for threat investigation', details: error.errors }, { status: 400 });
    }
    console.error('Error in investigate-threat API:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
