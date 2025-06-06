'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting peaceful resolution paths for disputes.
 *
 * - suggestResolutionPaths - A function that takes dispute details and generates suggested resolution paths.
 * - SuggestResolutionPathsInput - The input type for the suggestResolutionPaths function.
 * - SuggestResolutionPathsOutput - The return type for the suggestResolutionPaths function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestResolutionPathsInputSchema = z.object({
  testimonies: z.array(z.string()).describe('A list of testimonies from involved members.'),
  disputeType: z.string().describe('The type of dispute.'),
  ethicsRules: z.string().describe('The relevant clan ethics rules in JSON format.'),
});
export type SuggestResolutionPathsInput = z.infer<typeof SuggestResolutionPathsInputSchema>;

const SuggestResolutionPathsOutputSchema = z.object({
  resolutionPaths: z.array(z.string()).describe('A list of suggested peaceful resolution paths.'),
});
export type SuggestResolutionPathsOutput = z.infer<typeof SuggestResolutionPathsOutputSchema>;

export async function suggestResolutionPaths(input: SuggestResolutionPathsInput): Promise<SuggestResolutionPathsOutput> {
  return suggestResolutionPathsFlow(input);
}

const suggestResolutionPathsPrompt = ai.definePrompt({
  name: 'suggestResolutionPathsPrompt',
  input: {schema: SuggestResolutionPathsInputSchema},
  output: {schema: SuggestResolutionPathsOutputSchema},
  prompt: `You are an expert mediator skilled in resolving clan disputes peacefully.

  Given the following testimonies, dispute type, and clan ethics rules, suggest several distinct peaceful resolution paths.
  Consider various approaches, including compromise, reconciliation, and restorative justice.

  Testimonies:
  {{#each testimonies}}
  - {{{this}}}
  {{/each}}

  Dispute Type: {{{disputeType}}}

  Clan Ethics Rules:
  {{{ethicsRules}}}

  Provide resolution options which are appropriate given the clan ethics rules.

  Format your response as a numbered list of resolution paths.
  `,
});

const suggestResolutionPathsFlow = ai.defineFlow(
  {
    name: 'suggestResolutionPathsFlow',
    inputSchema: SuggestResolutionPathsInputSchema,
    outputSchema: SuggestResolutionPathsOutputSchema,
  },
  async input => {
    const {output} = await suggestResolutionPathsPrompt(input);
    return output!;
  }
);
