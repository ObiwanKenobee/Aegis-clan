// src/app/api/offer-scriptural-guidance/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { offerScripturalGuidance, OfferScripturalGuidanceInputSchema, type OfferScripturalGuidanceOutput } from '@/ai/flows/offer-scriptural-guidance';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const validatedInput = OfferScripturalGuidanceInputSchema.parse(requestBody);
    
    const result: OfferScripturalGuidanceOutput = await offerScripturalGuidance(validatedInput);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error in offerScripturalGuidance API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
