'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { suggestResolutionPaths, type SuggestResolutionPathsInput, type SuggestResolutionPathsOutput } from '@/ai/flows/suggest-resolution-paths';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const DisputeMediatorSchema = z.object({
  testimonies: z.string().min(10, 'Testimonies must be provided.'),
  disputeType: z.string().min(3, 'Dispute type is required.'),
  ethicsRules: z.string().min(10, 'Ethics rules (JSON format) are required.').refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: "Ethics rules must be valid JSON." }),
});

type DisputeMediatorFormValues = z.infer<typeof DisputeMediatorSchema>;

export function DisputeMediator() {
  const [isLoading, setIsLoading] = useState(false);
  const [resolutionPaths, setResolutionPaths] = useState<string[] | null>(null);
  const { toast } = useToast();

  const form = useForm<DisputeMediatorFormValues>({
    resolver: zodResolver(DisputeMediatorSchema),
    defaultValues: {
      testimonies: '',
      disputeType: '',
      ethicsRules: '{\n  "example_rule": {\n    "description": "This is a sample rule."\n  }\n}',
    },
  });

  const onSubmit: SubmitHandler<DisputeMediatorFormValues> = async (data) => {
    setIsLoading(true);
    setResolutionPaths(null);

    const testimoniesArray = data.testimonies.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    if (testimoniesArray.length === 0) {
      form.setError("testimonies", { type: "manual", message: "Please provide at least one testimony." });
      setIsLoading(false);
      return;
    }

    const input: SuggestResolutionPathsInput = {
      testimonies: testimoniesArray,
      disputeType: data.disputeType,
      ethicsRules: data.ethicsRules,
    };

    try {
      const result: SuggestResolutionPathsOutput = await suggestResolutionPaths(input);
      setResolutionPaths(result.resolutionPaths);
      toast({
        title: "Success",
        description: "Resolution paths suggested successfully.",
      });
    } catch (error) {
      console.error("Error suggesting resolution paths:", error);
      toast({
        title: "Error",
        description: "Failed to suggest resolution paths. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="testimonies"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="testimonies">Testimonies (One per line)</FormLabel>
                <FormControl>
                  <Textarea
                    id="testimonies"
                    placeholder="Enter each testimony on a new line..."
                    rows={5}
                    className="resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="disputeType"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="disputeType">Type of Dispute</FormLabel>
                <FormControl>
                  <Input id="disputeType" placeholder="e.g., Land dispute, Inheritance conflict" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="ethicsRules"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="ethicsRules">Clan Ethics Rules (JSON Format)</FormLabel>
                <FormControl>
                  <Textarea
                    id="ethicsRules"
                    placeholder='Enter clan ethics rules as a JSON object...'
                    rows={6}
                    className="font-code resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Suggest Resolution Paths
          </Button>
        </form>
      </Form>

      {resolutionPaths && resolutionPaths.length > 0 && (
        <Card className="mt-6 shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Suggested Resolution Paths</CardTitle>
            <CardDescription>Peaceful options to consider for resolving the dispute.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5">
              {resolutionPaths.map((path, index) => (
                <li key={index} className="text-sm">{path}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {resolutionPaths && resolutionPaths.length === 0 && (
         <Card className="mt-6 shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl">No Resolution Paths Suggested</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">The AI could not suggest any resolution paths based on the provided input.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
