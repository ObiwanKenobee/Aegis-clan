// src/app/api/suggest-resolution-paths/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { suggestResolutionPaths, SuggestResolutionPathsInputSchema, type SuggestResolutionPathsOutput } from '@/ai/flows/suggest-resolution-paths';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const validatedInput = SuggestResolutionPathsInputSchema.parse(requestBody);
    
    const result: SuggestResolutionPathsOutput = await suggestResolutionPaths(validatedInput);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error in suggestResolutionPaths API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
