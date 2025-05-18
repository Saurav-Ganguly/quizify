
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
import { saveQuiz, getUniqueSubjects } from '@/lib/quiz-store';
import { Loader2, UploadCloud, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";
import * as pdfjsLib from 'pdfjs-dist';

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

const MIN_TEXT_LENGTH_FOR_CONTENT = 400; 
const NON_CONTENT_PAGE_TITLES = [
  'table of contents', 'contents', 'index', 'preface', 'foreword',
  'appendix', 'bibliography', 'references', 'glossary',
  'acknowledgments', 'acknowledgements', 'errata', 
  'list of figures', 'list of tables', 'figure captions', 'table captions'
];

const isLikelyNonContentPage = (text: string, pageNumber: number, totalPages: number): boolean => {
  const lowerText = text.toLowerCase().trim();
  if (pageNumber <= 5 || pageNumber >= totalPages - 5) {
      if (NON_CONTENT_PAGE_TITLES.some(title => lowerText.includes(title)) && lowerText.length < MIN_TEXT_LENGTH_FOR_CONTENT + 200) {
          return true;
      }
  }
  for (const title of NON_CONTENT_PAGE_TITLES) {
    if (lowerText.startsWith(title) && lowerText.length < title.length + 150) {
      return true;
    }
  }
  if (lowerText.match(/^(chapter|part|section)\s+[0-9ivxlcdm]+/i) && lowerText.length < 150) {
    return true;
  }
  return false;
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function PdfUploadForm() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [pageErrors, setPageErrors] = useState<string[]>([]);
  const [uniqueSubjects, setUniqueSubjects] = useState<string[]>([]);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subjects = await getUniqueSubjects();
        setUniqueSubjects(subjects);
      } catch (error) {
        console.error("Failed to fetch unique subjects:", error);
        toast({
          title: "Warning",
          description: "Could not load existing subject suggestions.",
          variant: "default", 
        });
      }
    };
    fetchSubjects();
  }, [toast]);

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
    setIsProcessing(true);
    setProcessingMessage('Preparing PDF...');
    setProgress(0);
    setPageErrors([]);
    const pdfFile = data.pdfFile[0];
    setFileName(pdfFile.name);

    let allMcqs: Mcq[] = [];
    let allNotes: string[] = [];
    let pagesSkipped = 0;
    let pdfDataUri: string | null = null;

    try {
      pdfDataUri = await readFileAsDataURL(pdfFile); 
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdfDoc.numPages;
      setProcessingMessage(`Loaded PDF with ${numPages} pages. Starting MCQ & Notes generation...`);

      for (let i = 1; i <= numPages; i++) {
        setProcessingMessage(`Processing page ${i} of ${numPages}...`);
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        
        if (!pageText.trim()) {
          console.warn(`Page ${i} has no text content. Skipping.`);
          setPageErrors(prev => [...prev, `Page ${i}: No text content found, skipped.`]);
          pagesSkipped++;
          setProgress(((i / numPages) * 100));
          continue;
        }

        const lowerPageTextTrimmed = pageText.toLowerCase().trim();

        if (isLikelyNonContentPage(lowerPageTextTrimmed, i, numPages)) {
          console.warn(`Page ${i} identified as a non-content/structural page. Skipping.`);
          setPageErrors(prev => [...prev, `Page ${i}: Skipped (likely non-content/structural).`]);
          pagesSkipped++;
          setProgress(((i / numPages) * 100));
          continue;
        }

        if (lowerPageTextTrimmed.length < MIN_TEXT_LENGTH_FOR_CONTENT) {
          console.warn(`Page ${i} has very little text content. Skipping.`);
          setPageErrors(prev => [...prev, `Page ${i}: Skipped (too short for MCQs/Notes).`]);
          pagesSkipped++;
          setProgress(((i / numPages) * 100));
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
          if (result && result.pageNotes) {
            allNotes.push(`Page ${i}:\n${result.pageNotes}`);
          } else {
            console.warn(`No notes generated for page ${i}.`);
             setPageErrors(prev => [...prev, `Page ${i}: No Notes returned by AI.`]);
          }
        } catch (pageError: any) {
          console.error(`Error generating content for page ${i}:`, pageError);
          setPageErrors(prev => [...prev, `Page ${i}: ${pageError.message || 'AI generation failed'}`]);
        }
        setProgress(((i / numPages) * 100));
      }

      setProcessingMessage('Finalizing quiz...');
      const combinedNotes = allNotes.join('\n\n---\n\n');

      if (allMcqs.length > 0) {
        const newQuiz = await saveQuiz(data.subject, allMcqs, pdfFile.name, combinedNotes, pdfDataUri);
        let description = `Quiz & Notes for "${data.subject}" created. ${allMcqs.length} questions.`;
        if (pagesSkipped > 0) {
            description += ` ${pagesSkipped} page(s) were skipped.`;
        }
        if (pageErrors.length > pagesSkipped) {
             description += ` Some other pages also had issues.`;
        }

        toast({
          title: "Quiz & Notes Generated Successfully!",
          description: description,
          duration: (pageErrors.length > 0 || pagesSkipped > 0) ? 10000 : 5000,
        });
        
        const processingIssues = pageErrors.filter(err => !err.includes("Skipped"));
        if (processingIssues.length > 0) {
          toast({
            title: "Page Processing Issues",
            description: (
              <ul className="list-disc list-inside">
                {processingIssues.slice(0,3).map((err, idx) => <li key={idx}>{err}</li>)}
                {processingIssues.length > 3 && <li>And {processingIssues.length-3} more...</li>}
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
          description: "Could not generate any MCQs from the PDF. "  + (pageErrors.length > 0 ? `Details: ${pageErrors.map(e => e.split(':')[1] || e).join(', ')}` : "Please try a different PDF or subject."),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error processing PDF or generating content:", error);
      toast({
        title: "Error",
        description: `An error occurred: ${error.message || String(error)}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingMessage('');
      if (allMcqs.length === 0 && pageErrors.length === 0 && pagesSkipped === 0) setProgress(0); 
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Create New Quiz & Notes</CardTitle>
        <CardDescription>Upload a PDF to generate MCQs and exam-focused notes page by page.</CardDescription>
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
                    <Input 
                      placeholder="e.g., Quantum Physics" 
                      {...field} 
                      disabled={isProcessing} 
                      list="subject-suggestions"
                    />
                  </FormControl>
                  <datalist id="subject-suggestions">
                    {uniqueSubjects.map((subject) => (
                      <option key={subject} value={subject} />
                    ))}
                  </datalist>
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
                        isProcessing ? "cursor-not-allowed opacity-70" : ""
                      )}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">PDF only</p>
                        {fileName && !isProcessing && <p className="mt-2 text-sm text-foreground">{fileName}</p>}
                        {isProcessing && processingMessage && <p className="mt-2 text-sm text-primary">{processingMessage}</p>}
                      </div>
                      <Input
                        id="pdfFile"
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={isProcessing}
                      />
                    </Label>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round(progress)}% complete
                </p>
              </div>
            )}
            {pageErrors.length > 0 && !isProcessing && (
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
            <Button type="submit" className="w-full" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Quiz & Notes...
                </>
              ) : (
                "Generate Quiz & Notes"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

