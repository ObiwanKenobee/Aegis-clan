
'use server';
/**
 * @fileOverview A Genkit flow for simulating threat response.
 *
 * - respondToThreat - A function that takes an investigated threat and suggests response actions.
 * - RespondToThreatInput - The input type for the respondToThreat function.
 * - RespondToThreatOutput - The return type for the respondToThreat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const RespondToThreatInputSchema = z.object({
  investigationId: z.string().min(1, 'Investigation ID is required.').describe('The ID of the investigation related to this threat (from InvestigateThreatOutput).'),
  threatTitle: z.string().describe('The title of the threat (e.g., "Potential Ransomware Activity").'),
  threatSeverity: z.enum(['Critical', 'High', 'Medium', 'Low', 'Informational']).describe('Assessed severity of the threat.'),
  investigationSummary: z.string().min(10, 'Investigation summary is required.').describe('A summary of the investigation findings.'),
  desiredOutcome: z.string().optional().describe('Optional: Desired outcome for the response (e.g., "Contain spread and recover systems", "Eradicate malware and prevent recurrence", "Gather forensic evidence for legal action"). Defaults to "Contain, Eradicate, Recover".'),
});
export type RespondToThreatInput = z.infer<typeof RespondToThreatInputSchema>;

const ResponseActionSchema = z.object({
  actionId: z.string().describe('A unique identifier for this response action step.'),
  category: z.enum(['Containment', 'Eradication', 'Recovery', 'Post-Incident']).describe('Category of the response action (e.g., PICERL phases).'),
  description: z.string().describe('Detailed description of the response action to be taken.'),
  priority: z.enum(['High', 'Medium', 'Low']).describe('Priority of this action step.'),
  estimatedEffort: z.string().optional().describe('Estimated effort or resources required (e.g., "Low", "Medium", "High", "2 hours").'),
});

export const RespondToThreatOutputSchema = z.object({
  responsePlanId: z.string().describe('A unique identifier for this generated response plan.'),
  investigationId: z.string().describe('The investigation ID this response plan pertains to.'),
  suggestedActions: z.array(ResponseActionSchema).describe('A list of suggested response actions, categorized and prioritized.'),
  incidentReportDraft: z.string().optional().describe('A brief, AI-generated draft for an incident report summary based on the threat and response.'),
});
export type RespondToThreatOutput = z.infer<typeof RespondToThreatOutputSchema>;

export async function respondToThreat(input: RespondToThreatInput): Promise<RespondToThreatOutput> {
  return respondToThreatFlow(input);
}

const threatResponsePrompt = ai.definePrompt({
  name: 'threatResponsePrompt',
  input: {schema: RespondToThreatInputSchema},
  output: {schema: RespondToThreatOutputSchema},
  prompt: `You are an AI SOC Analyst for an XDR system, responsible for generating threat response plans.

Threat Details:
Investigation ID: {{{investigationId}}}
Threat Title: {{{threatTitle}}}
Severity: {{{threatSeverity}}}
Investigation Summary: {{{investigationSummary}}}

Desired Outcome: {{{desiredOutcome || 'Follow standard incident response: Contain the threat, Eradicate it from systems, Recover affected services, and outline Post-Incident activities.'}}}

Based on the threat details and desired outcome:
1.  Generate a unique 'responsePlanId' (e.g., resp-{{timestamp}}-{{random}}).
2.  Create a list of 'suggestedActions'. Each action should have:
    - A unique 'actionId' (e.g., act-{{@index}}).
    - A 'category' (Containment, Eradication, Recovery, Post-Incident).
    - A detailed 'description' of the action.
    - A 'priority' (High, Medium, Low).
    - Optional 'estimatedEffort'.
3.  Provide an 'incidentReportDraft' (a brief summary paragraph for an incident report).

Ensure your output strictly adheres to the requested JSON schema for RespondToThreatOutput.
Actions should be specific, actionable, and follow a logical sequence based on PICERL (Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned) principles where applicable.
Prioritize actions based on severity and potential impact.
`,
});

const respondToThreatFlow = ai.defineFlow(
  {
    name: 'respondToThreatFlow',
    inputSchema: RespondToThreatInputSchema,
    outputSchema: RespondToThreatOutputSchema,
  },
  async (input: RespondToThreatInput) => {
    const uniqueIdPart = Math.random().toString(36).substring(2, 10);
    const timestampPart = Date.now();
    const responsePlanId = `resp-${timestampPart}-${uniqueIdPart}`;

    const {output} = await threatResponsePrompt(input);
    if (!output) {
      throw new Error("Threat Response AI failed to produce an output.");
    }
    return {
      ...output,
      responsePlanId: responsePlanId, // Ensure responsePlanId is set
      investigationId: input.investigationId,
      suggestedActions: output.suggestedActions || [],
    };
  }
);
