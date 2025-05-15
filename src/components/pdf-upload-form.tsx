
"use client";

import type { ChangeEvent } from 'react';
import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { generateMcqsForPage, type GenerateMcqsForPageInput } from '@/ai/flows/generate-mcqs-for-page';
import type { Mcq } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { saveQuiz } from '@/lib/quiz-store';
import { Loader2, UploadCloud, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
// Ensure the worker is correctly sourced. This path might need adjustment based on your build setup.
// For Next.js, often it's copied to the public directory or served from a CDN.
// If using a local copy, make sure it's accessible.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}


const formSchema = z.object({
  subject: z.string().min(3, { message: "Subject must be at least 3 characters." }).max(100),
  pdfFile: z.custom<FileList>((v) => v instanceof FileList && v.length > 0, {
    message: 'PDF file is required.',
  }).refine(files => files?.[0]?.type === "application/pdf", "File must be a PDF."),
});

type PdfUploadFormValues = z.infer<typeof formSchema>;

export function PdfUploadForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [pageErrors, setPageErrors] = useState<string[]>([]);

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
      form.setValue("pdfFile", files);
      setProgress(0);
      setProcessingMessage('');
      setPageErrors([]);
    } else {
      setFileName(null);
      form.setValue("pdfFile", undefined as any);
    }
  };

  const onSubmit: SubmitHandler<PdfUploadFormValues> = async (data) => {
    setIsLoading(true);
    setProcessingMessage('Preparing PDF...');
    setProgress(0);
    setPageErrors([]);
    const pdfFile = data.pdfFile[0];
    setFileName(pdfFile.name);

    let allMcqs: Mcq[] = [];

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdfDoc.numPages;
      setProcessingMessage(`Loaded PDF with ${numPages} pages. Starting MCQ generation...`);

      for (let i = 1; i <= numPages; i++) {
        setProcessingMessage(`Processing page ${i} of ${numPages}...`);
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        
        if (!pageText.trim()) {
          console.warn(`Page ${i} has no text content. Skipping.`);
          setProgress(((i / numPages) * 100));
          setPageErrors(prev => [...prev, `Page ${i}: No text content found, skipped.`]);
          continue;
        }

        const aiInput: GenerateMcqsForPageInput = {
          pageText,
          subject: data.subject,
          pageNumber: i,
          totalPages: numPages,
        };

        try {
          const result = await generateMcqsForPage(aiInput);
          if (result && result.mcqs && result.mcqs.length > 0) {
            allMcqs.push(...result.mcqs);
          } else {
            console.warn(`No MCQs generated for page ${i}.`);
            setPageErrors(prev => [...prev, `Page ${i}: No MCQs returned by AI.`]);
          }
        } catch (pageError: any) {
          console.error(`Error generating MCQs for page ${i}:`, pageError);
          setPageErrors(prev => [...prev, `Page ${i}: ${pageError.message || 'AI generation failed'}`]);
        }
        setProgress(((i / numPages) * 100));
      }

      setProcessingMessage('Finalizing quiz...');
      if (allMcqs.length > 0) {
        const newQuiz = saveQuiz(data.subject, allMcqs, pdfFile.name);
        toast({
          title: "Quiz Generated Successfully!",
          description: `MCQs for "${data.subject}" created with ${allMcqs.length} questions. ${pageErrors.length > 0 ? `${pageErrors.length} page(s) had issues.` : ''}`,
          duration: pageErrors.length > 0 ? 10000 : 5000,
        });
        if (pageErrors.length > 0) {
          toast({
            title: "Page Processing Issues",
            description: (
              <ul className="list-disc list-inside">
                {pageErrors.slice(0, 3).map((err, idx) => <li key={idx}>{err}</li>)}
                {pageErrors.length > 3 && <li>And {pageErrors.length-3} more...</li>}
              </ul>
            ),
            variant: "destructive",
            duration: 10000,
          })
        }
        router.push(`/quizzes/${newQuiz.id}`);
      } else {
        toast({
          title: "Generation Failed",
          description: "Could not generate any MCQs from the PDF. " + (pageErrors.length > 0 ? `Details: ${pageErrors.join(', ')}` : "Please try a different PDF or subject."),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error processing PDF or generating MCQs:", error);
      toast({
        title: "Error",
        description: `An error occurred: ${error.message || String(error)}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setProcessingMessage('');
      // Keep progress at 100 if successful or if there were partial errors
      if (allMcqs.length === 0 && pageErrors.length === 0) setProgress(0); 
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Create New Quiz</CardTitle>
        <CardDescription>Upload a PDF and enter the subject to generate MCQs page by page.</CardDescription>
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
              render={() => (
                <FormItem>
                  <FormLabel>PDF Document</FormLabel>
                  <FormControl>
                    <Label
                      htmlFor="pdfFile"
                      className={cn(
                        "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50",
                        form.formState.errors.pdfFile ? "border-destructive" : "border-input",
                        isLoading ? "cursor-not-allowed opacity-70" : ""
                      )}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PDF only</p>
                        {fileName && !isLoading && <p className="mt-2 text-sm text-foreground">{fileName}</p>}
                        {isLoading && processingMessage && <p className="mt-2 text-sm text-primary">{processingMessage}</p>}
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
            {isLoading && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round(progress)}% complete
                </p>
              </div>
            )}
            {pageErrors.length > 0 && !isLoading && (
              <div className="mt-4 p-3 border border-destructive/50 rounded-md bg-destructive/10">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertTriangle className="h-5 w-5" />
                  <h4 className="font-semibold">Issues during generation:</h4>
                </div>
                <ul className="list-disc list-inside text-sm text-destructive/80 max-h-32 overflow-y-auto">
                  {pageErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
              </div>
            )}
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
