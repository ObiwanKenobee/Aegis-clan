
'use server';
/**
 * @fileOverview A Genkit flow for simulating threat investigation.
 *
 * - investigateThreat - A function that takes a threat identifier and context, returning an investigation summary.
 * - InvestigateThreatInput - The input type for the investigateThreat function.
 * - InvestigateThreatOutput - The return type for the investigateThreat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const InvestigateThreatInputSchema = z.object({
  threatId: z.string().min(1, 'Threat ID is required.').describe('The identifier of the threat to investigate (e.g., from a detection system).'),
  threatDescription: z.string().min(10, 'Threat description must be at least 10 characters.').describe('A description of the threat being investigated.'),
  availableTelemetry: z.array(z.string()).optional().describe('Optional: List of available telemetry sources or types of data that can be queried (e.g., "endpoint logs", "network flows", "authentication logs").'),
  investigationScope: z.string().optional().describe('Optional: Specific scope or questions for the investigation (e.g., "identify root cause", "determine blast radius", "find evidence of data exfiltration").'),
});
export type InvestigateThreatInput = z.infer<typeof InvestigateThreatInputSchema>;

const AffectedAssetSchema = z.object({
  assetId: z.string().describe('Identifier of the affected asset (e.g., hostname, IP address, user account).'),
  assetType: z.string().describe('Type of asset (e.g., "Endpoint", "Server", "User Account", "Application").'),
  impactAssessment: z.string().describe('Brief assessment of the impact on this asset.'),
});

export const InvestigateThreatOutputSchema = z.object({
  investigationId: z.string().describe('A unique identifier for this investigation instance.'),
  threatId: z.string().describe('The ID of the threat that was investigated.'),
  summary: z.string().describe('A summary of the investigation findings.'),
  potentialRootCause: z.string().optional().describe('The suspected root cause of the threat.'),
  affectedAssets: z.array(AffectedAssetSchema).optional().describe('A list of assets potentially affected by this threat.'),
  confidenceLevel: z.enum(['High', 'Medium', 'Low']).describe('Confidence level in the investigation findings.'),
  recommendedNextSteps: z.array(z.string()).describe('Recommended next steps (e.g., "Initiate response procedures", "Collect further forensic data", "Monitor specific indicators").'),
});
export type InvestigateThreatOutput = z.infer<typeof InvestigateThreatOutputSchema>;

export async function investigateThreat(input: InvestigateThreatInput): Promise<InvestigateThreatOutput> {
  return investigateThreatFlow(input);
}

const threatInvestigationPrompt = ai.definePrompt({
  name: 'threatInvestigationPrompt',
  input: {schema: InvestigateThreatInputSchema},
  output: {schema: InvestigateThreatOutputSchema},
  prompt: `You are an AI SOC Analyst for an XDR system, specialized in threat investigation.

Threat to Investigate:
ID: {{{threatId}}}
Description: {{{threatDescription}}}

Available Telemetry (if provided):
{{#if availableTelemetry}}
{{#each availableTelemetry}}
- {{{this}}}
{{/each}}
{{else}}
Assume standard enterprise telemetry is available (endpoint, network, identity, cloud).
{{/if}}

Investigation Scope (if provided): {{{investigationScope || 'Comprehensive investigation: identify root cause, map potential attack path, assess impact, and identify affected assets.'}}}

Based on the threat details and investigation scope:
1.  Generate a unique 'investigationId' (e.g., inv-{{timestamp}}-{{random}}).
2.  Provide a 'summary' of your simulated investigation findings.
3.  Suggest a 'potentialRootCause'.
4.  List any 'affectedAssets' with their type and impact.
5.  State your 'confidenceLevel' (High, Medium, Low) in these findings.
6.  Recommend 'recommendedNextSteps' for the SOC team.

Ensure your output strictly adheres to the requested JSON schema for InvestigateThreatOutput.
Be methodical and logical in your simulated investigation.
If information is insufficient for a strong conclusion, state that and adjust confidence.
`,
});

const investigateThreatFlow = ai.defineFlow(
  {
    name: 'investigateThreatFlow',
    inputSchema: InvestigateThreatInputSchema,
    outputSchema: InvestigateThreatOutputSchema,
  },
  async (input: InvestigateThreatInput) => {
    // Generate a simple investigationId for the simulation
    const uniqueIdPart = Math.random().toString(36).substring(2, 10);
    const timestampPart = Date.now();
    const investigationId = `inv-${timestampPart}-${uniqueIdPart}`;

    const {output} = await threatInvestigationPrompt(input);
    if (!output) {
      throw new Error("Threat Investigation AI failed to produce an output.");
    }
    return {
      ...output,
      investigationId: investigationId, // Ensure investigationId is set
      threatId: input.threatId,
      affectedAssets: output.affectedAssets || [],
      recommendedNextSteps: output.recommendedNextSteps || ['No specific next steps generated.'],
    };
  }
);
