
'use server';
/**
 * @fileOverview A Genkit flow for the CovenantAgent to interpret moral rules.
 *
 * - interpretMoralRules - A function that analyzes a situation against a set of moral rules.
 * - InterpretMoralRulesInput - The input type for the interpretMoralRules function.
 * - InterpretMoralRulesOutput - The return type for the interpretMoralRules function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const InterpretMoralRulesInputSchema = z.object({
  situationDescription: z.string().min(10, 'Situation description must be at least 10 characters.').describe('A detailed description of the situation or action to be evaluated.'),
  moralRulesJson: z.string().describe('The clan\'s moral rules in JSON format (based on ethics_rules.schema.json).').refine((val) => {
    try {
      JSON.parse(val); // Check if it's valid JSON
      return true;
    } catch (e) {
      return false;
    }
  }, { message: "Moral rules must be valid JSON." }),
  clanContext: z.string().optional().describe('Optional additional context about the clan, its region, governance style, or specific traditions relevant to the situation.'),
});
export type InterpretMoralRulesInput = z.infer<typeof InterpretMoralRulesInputSchema>;

const ConflictDetailSchema = z.object({
  rule_id_implicated: z.string().describe('The ID of the rule that is in conflict or potentially violated.'),
  conflict_description: z.string().describe('A description of how the situation conflicts with the rule.'),
  relevant_condition: z.string().optional().describe('The specific condition within the rule that is relevant, if applicable.'),
  suggested_action_or_review: z.string().describe('What action or review is suggested due to this conflict.'),
});

export const InterpretMoralRulesOutputSchema = z.object({
  overallAssessment: z.string().describe('A general assessment of the situation in light of the moral rules (e.g., "Compliant", "Minor Conflict", "Significant Conflict").'),
  conflicts: z.array(ConflictDetailSchema).describe('A list of identified conflicts between the situation and the moral rules. Empty if no conflicts.'),
  recommendation: z.string().describe('A summary recommendation or next steps for the elders or parties involved.'),
  pertinentScripturalReferences: z.array(z.string()).optional().describe('Any scriptural references cited by the rules that are particularly pertinent to the identified conflicts or assessment.'),
  confidenceScore: z.number().min(0).max(1).describe('The AI\'s confidence in its interpretation, from 0.0 (low) to 1.0 (high).'),
});
export type InterpretMoralRulesOutput = z.infer<typeof InterpretMoralRulesOutputSchema>;


export async function interpretMoralRules(input: InterpretMoralRulesInput): Promise<InterpretMoralRulesOutput> {
  return interpretMoralRulesFlow(input);
}

const interpretMoralRulesPrompt = ai.definePrompt({
  name: 'interpretMoralRulesPrompt',
  input: {schema: InterpretMoralRulesInputSchema},
  output: {schema: InterpretMoralRulesOutputSchema},
  prompt: `You are the CovenantAgent, an AI designed to help interpret a clan's moral rules and identify potential conflicts.
You will be given a description of a situation, the clan's moral rules in JSON format, and optionally, some clan context.

Situation Description:
{{{situationDescription}}}

Clan's Moral Rules (JSON):
\`\`\`json
{{{moralRulesJson}}}
\`\`\`

{{#if clanContext}}
Additional Clan Context (may include region, governance style, specific traditions):
{{{clanContext}}}
Consider this context, including any mentioned regional customs or governance styles (e.g., Elder Council, Consensus-based), when formulating your interpretation and recommendation.
{{/if}}

Your tasks are:
1.  Carefully analyze the situation description in relation to EACH rule defined in the moral rules JSON.
2.  Identify any conflicts, violations, or areas where the situation does not align with the stated rules and their conditions.
3.  For each conflict, accurately populate all fields of the ConflictDetailSchema: 'rule_id_implicated', 'conflict_description', 'relevant_condition' (if applicable), and 'suggested_action_or_review'.
4.  Provide an 'overallAssessment' of the situation (e.g., "Compliant", "Minor Conflict requiring clarification", "Significant Conflict requiring elder review").
5.  Formulate a concise 'recommendation' for the clan elders or involved parties.
6.  If specific scriptural references are cited in the rules that become relevant to identified conflicts, list them under 'pertinentScripturalReferences'.
7.  Provide a 'confidenceScore' (a number between 0.0 and 1.0) representing your confidence in this overall interpretation and recommendation.

Ensure your output strictly adheres to the requested JSON schema for InterpretMoralRulesOutput.
If no conflicts are found, the 'conflicts' array MUST be an empty array [], and the assessment should reflect compliance.
`,
});

const interpretMoralRulesFlow = ai.defineFlow(
  {
    name: 'interpretMoralRulesFlow',
    inputSchema: InterpretMoralRulesInputSchema,
    outputSchema: InterpretMoralRulesOutputSchema,
  },
  async (input: InterpretMoralRulesInput) => {
    const {output} = await interpretMoralRulesPrompt(input);
    if (!output) {
      throw new Error("CovenantAgent failed to produce an interpretation.");
    }
    // Ensure the output conforms, especially the conflicts array and confidence score.
    return {
        ...output,
        conflicts: output.conflicts || [], // Ensure conflicts is an array, even if empty
        confidenceScore: output.confidenceScore !== undefined && output.confidenceScore !== null ? output.confidenceScore : 0.5, // Default confidence if not provided
    };
  }
);

