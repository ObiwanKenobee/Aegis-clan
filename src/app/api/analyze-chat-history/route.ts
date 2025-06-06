
// src/app/api/analyze-chat-history/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { authAdmin, firestoreAdmin } from '@/lib/firebase/admin';
import { analyzeChatHistory, AnalyzeChatHistoryInputSchema, type AnalyzeChatHistoryOutput } from '@/ai/flows/analyze-chat-history-flow';

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
    // TODO: Add custom claim checks if specific roles are needed for chat analysis
    // e.g., if (!decodedToken.canAnalyzeChats) {
    //   return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 });
    // }
  } catch (error) {
    console.error('Error verifying ID token:', error);
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const requestBody = await request.json();
    const validatedInput = AnalyzeChatHistoryInputSchema.parse(requestBody);
    
    const result: AnalyzeChatHistoryOutput = await analyzeChatHistory(validatedInput);

    // Log to agent_logs
    try {
      const logEntryRef = firestoreAdmin.collection('agent_logs').doc();
      await logEntryRef.set({
        log_id: logEntryRef.id,
        agent: "ChatHistoryAnalyzer", // Or a more specific agent name if you have variants
        trigger_event: "chatHistoryAnalysisRequested",
        timestamp: firestoreAdmin.FieldValue.serverTimestamp(),
        decision: `Analysis generated for prompt: "${validatedInput.analysisPrompt.substring(0, 50)}..."`, // A summary
        context: {
          requested_by_uid: userId,
          clan_id: decodedToken.clanId || null,
          analysisPrompt: validatedInput.analysisPrompt,
          clanContext: validatedInput.clanContext,
          // Storing all chat messages might be too verbose for logs depending on length.
          // Consider storing a hash, count, or a reference if messages are stored elsewhere.
          chatMessagesCount: validatedInput.chatMessages.length,
        },
        result: { analysis: result.analysis }, 
        // ethics_reference: null, // Or relevant if analysis involves ethical considerations
      });
    } catch (dbError) {
      console.error('Error saving chat analysis log to Firestore agent_logs:', dbError);
      // Log error but proceed to return AI result
    }
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input for chat history analysis', details: error.errors }, { status: 400 });
    }
    console.error('Error in analyzeChatHistory API:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
