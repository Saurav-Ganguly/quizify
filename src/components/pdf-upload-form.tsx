
"use client";

import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { generateMcqsFromPdf, type GenerateMcqsFromPdfInput } from '@/ai/flows/generate-mcqs-from-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { saveQuiz } from '@/lib/quiz-store';
import { Loader2, UploadCloud } from 'lucide-react';
import { cn } from "@/lib/utils";

const formSchema = z.object({
  subject: z.string().min(3, { message: "Subject must be at least 3 characters." }).max(100),
  pdfFile: z.custom<FileList>((v) => v instanceof FileList && v.length > 0, {
    message: 'PDF file is required.',
  }).refine(files => files?.[0]?.type === "application/pdf", "File must be a PDF."),
});

type PdfUploadFormValues = z.infer<typeof formSchema>;

const fileToDataUri = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target?.result as string);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

export function PdfUploadForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<PdfUploadFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFileName(files[0].name);
      form.setValue("pdfFile", files); // Set value for react-hook-form
    } else {
      setFileName(null);
      form.setValue("pdfFile", undefined as any); // Clear value
    }
  };

  const onSubmit: SubmitHandler<PdfUploadFormValues> = async (data) => {
    setIsLoading(true);
    setFileName(data.pdfFile[0].name); // Ensure fileName is set from submitted data
    try {
      const pdfFile = data.pdfFile[0];
      const pdfDataUri = await fileToDataUri(pdfFile);

      const aiInput: GenerateMcqsFromPdfInput = {
        pdfDataUri,
        subject: data.subject,
      };

      const result = await generateMcqsFromPdf(aiInput);

      if (result && result.mcqs && result.mcqs.length > 0) {
        const newQuiz = saveQuiz(data.subject, result.mcqs, pdfFile.name);
        toast({
          title: "Quiz Generated!",
          description: `MCQs for "${data.subject}" created successfully.`,
        });
        router.push(`/quizzes/${newQuiz.id}`);
      } else {
        toast({
          title: "Generation Failed",
          description: "Could not generate MCQs from the PDF. The AI might have returned an empty or invalid response. Please try a different PDF or subject.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating MCQs:", error);
      toast({
        title: "Error",
        description: `An error occurred: ${error instanceof Error ? error.message : String(error)}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Create New Quiz</CardTitle>
        <CardDescription>Upload a PDF and enter the subject to generate MCQs.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Quantum Physics" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pdfFile"
              render={() => ( // Note: field is not directly used here for file input styling
                <FormItem>
                  <FormLabel>PDF Document</FormLabel>
                  <FormControl>
                    <Label
                      htmlFor="pdfFile"
                      className={cn(
                        "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50",
                        form.formState.errors.pdfFile ? "border-destructive" : "border-input"
                      )}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PDF only (MAX. 10MB)</p>
                        {fileName && <p className="mt-2 text-sm text-foreground">{fileName}</p>}
                      </div>
                      <Input
                        id="pdfFile"
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={isLoading}
                      />
                    </Label>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating MCQs...
                </>
              ) : (
                "Generate Quiz"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

