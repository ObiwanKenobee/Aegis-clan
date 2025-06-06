'use server';
/**
 * @fileOverview This file defines a Genkit flow for offering scriptural guidance related to decisions.
 *
 * - offerScripturalGuidance - A function that takes a decision and offers relevant scriptural references.
 * - OfferScripturalGuidanceInput - The input type for the offerScripturalGuidance function.
 * - OfferScripturalGuidanceOutput - The return type for the offerScripturalGuidance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OfferScripturalGuidanceInputSchema = z.object({
  decision: z.string().describe('The decision for which scriptural guidance is needed.'),
  clanTraditions: z.string().optional().describe('The clan traditions to consider when offering guidance.'),
});
export type OfferScripturalGuidanceInput = z.infer<typeof OfferScripturalGuidanceInputSchema>;

const OfferScripturalGuidanceOutputSchema = z.object({
  scripturalReference: z.string().describe('A relevant scriptural reference.'),
  explanation: z.string().describe('An explanation of how the scriptural reference relates to the decision.'),
});
export type OfferScripturalGuidanceOutput = z.infer<typeof OfferScripturalGuidanceOutputSchema>;

export async function offerScripturalGuidance(input: OfferScripturalGuidanceInput): Promise<OfferScripturalGuidanceOutput> {
  return offerScripturalGuidanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'offerScripturalGuidancePrompt',
  input: {schema: OfferScripturalGuidanceInputSchema},
  output: {schema: OfferScripturalGuidanceOutputSchema},
  prompt: `You are a wise advisor, skilled in interpreting scripture and applying it to real-life decisions.

  The clan is facing the following decision: {{{decision}}}

  Consider also the following clan traditions: {{{clanTraditions}}}

  Offer a scriptural reference that is relevant to this decision, and explain how it applies.
  Format your response as follows:
  Scriptural Reference: <reference>
  Explanation: <explanation>`,
});

const offerScripturalGuidanceFlow = ai.defineFlow(
  {
    name: 'offerScripturalGuidanceFlow',
    inputSchema: OfferScripturalGuidanceInputSchema,
    outputSchema: OfferScripturalGuidanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
