'use client';

import { useState, type ReactNode } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buildFamilyTree, type BuildFamilyTreeInput, type BuildFamilyTreeOutput } from '@/ai/flows/build-family-tree';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const AncestryManagerSchema = z.object({
  familyData: z.string().min(10, 'Family data must be at least 10 characters long.'),
});

type AncestryManagerFormValues = z.infer<typeof AncestryManagerSchema>;

export function AncestryManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [familyTreeResult, setFamilyTreeResult] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<AncestryManagerFormValues>({
    resolver: zodResolver(AncestryManagerSchema),
    defaultValues: {
      familyData: '',
    },
  });

  const onSubmit: SubmitHandler<AncestryManagerFormValues> = async (data) => {
    setIsLoading(true);
    setFamilyTreeResult(null);
    try {
      const result: BuildFamilyTreeOutput = await buildFamilyTree(data);
      setFamilyTreeResult(result.familyTree);
      toast({
        title: "Success",
        description: "Family tree generated successfully.",
      });
    } catch (error) {
      console.error("Error building family tree:", error);
      toast({
        title: "Error",
        description: "Failed to generate family tree. Please try again.",
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
            name="familyData"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="familyData">Family Data (Text or Structured Info)</FormLabel>
                <FormControl>
                  <Textarea
                    id="familyData"
                    placeholder="Enter family relationships, names, dates, e.g., 'John (father) married Jane (mother). They had a son, Mike, born 1990...'"
                    rows={6}
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
            Build Family Tree
          </Button>
        </form>
      </Form>

      {familyTreeResult && (
        <Card className="mt-6 shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Generated Family Tree</CardTitle>
            <CardDescription>Textual representation of the family structure.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm overflow-x-auto">{familyTreeResult}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
