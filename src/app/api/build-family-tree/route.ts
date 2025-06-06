// src/app/api/build-family-tree/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { buildFamilyTree, BuildFamilyTreeInputSchema, type BuildFamilyTreeOutput } from '@/ai/flows/build-family-tree';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const validatedInput = BuildFamilyTreeInputSchema.parse(requestBody);
    
    const result: BuildFamilyTreeOutput = await buildFamilyTree(validatedInput);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    console.error('Error in buildFamilyTree API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
