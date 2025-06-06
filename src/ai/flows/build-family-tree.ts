
'use server';

/**
 * @fileOverview An AI agent for building and updating family trees.
 *
 * - buildFamilyTree - A function that handles the family tree construction process.
 * - BuildFamilyTreeInput - The input type for the buildFamilyTree function.
 * - BuildFamilyTreeOutput - The return type for the buildFamilyTree function.
 *
 * When this flow is deployed as a Google Cloud Function microservice,
 * it should be configured with IAM settings to require authentication.
 * It expects to be invoked by an authenticated service identity (e.g.,
 * the service account of the Next.js BFF or another authorized service)
 * which provides a Google-signed OIDC Identity Token in the Authorization header.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BuildFamilyTreeInputSchema = z.object({
  familyData: z
    .string()
    .describe(
      'Structured family data in text or audio format to build the family tree.'
    ),
});
export type BuildFamilyTreeInput = z.infer<typeof BuildFamilyTreeInputSchema>;

const BuildFamilyTreeOutputSchema = z.object({
  familyTree: z
    .string()
    .describe('A textual representation of the generated family tree.'),
});
export type BuildFamilyTreeOutput = z.infer<typeof BuildFamilyTreeOutputSchema>;

export async function buildFamilyTree(
  input: BuildFamilyTreeInput
): Promise<BuildFamilyTreeOutput> {
  return buildFamilyTreeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'buildFamilyTreePrompt',
  input: {schema: BuildFamilyTreeInputSchema},
  output: {schema: BuildFamilyTreeOutputSchema},
  prompt: `You are an expert genealogist. You will take the provided family data and generate a well-formatted family tree.

Family Data: {{{familyData}}}`,
});

const buildFamilyTreeFlow = ai.defineFlow(
  {
    name: 'buildFamilyTreeFlow',
    inputSchema: BuildFamilyTreeInputSchema,
    outputSchema: BuildFamilyTreeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
