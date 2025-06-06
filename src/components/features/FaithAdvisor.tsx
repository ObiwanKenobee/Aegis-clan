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
import { offerScripturalGuidance, type OfferScripturalGuidanceInput, type OfferScripturalGuidanceOutput } from '@/ai/flows/offer-scriptural-guidance';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const FaithAdvisorSchema = z.object({
  decision: z.string().min(5, 'Decision description is required.'),
  clanTraditions: z.string().optional(),
});

type FaithAdvisorFormValues = z.infer<typeof FaithAdvisorSchema>;

export function FaithAdvisor() {
  const [isLoading, setIsLoading] = useState(false);
  const [guidance, setGuidance] = useState<OfferScripturalGuidanceOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<FaithAdvisorFormValues>({
    resolver: zodResolver(FaithAdvisorSchema),
    defaultValues: {
      decision: '',
      clanTraditions: '',
    },
  });

  const onSubmit: SubmitHandler<FaithAdvisorFormValues> = async (data) => {
    setIsLoading(true);
    setGuidance(null);
    try {
      const result: OfferScripturalGuidanceOutput = await offerScripturalGuidance(data);
      setGuidance(result);
      toast({
        title: "Success",
        description: "Scriptural guidance offered successfully.",
      });
    } catch (error) {
      console.error("Error offering scriptural guidance:", error);
      toast({
        title: "Error",
        description: "Failed to offer scriptural guidance. Please try again.",
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
            name="decision"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="decision">Decision Requiring Guidance</FormLabel>
                <FormControl>
                  <Textarea
                    id="decision"
                    placeholder="Describe the decision or situation..."
                    rows={3}
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
            name="clanTraditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="clanTraditions">Relevant Clan Traditions (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    id="clanTraditions"
                    placeholder="Describe any relevant clan traditions..."
                    rows={3}
                    className="resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Seek Wisdom
          </Button>
        </form>
      </Form>

      {guidance && (
        <Card className="mt-6 shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Scriptural Guidance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold text-md">Reference:</h4>
              <p className="text-sm bg-muted p-2 rounded-md">{guidance.scripturalReference}</p>
            </div>
            <div>
              <h4 className="font-semibold text-md">Explanation:</h4>
              <p className="text-sm leading-relaxed">{guidance.explanation}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
