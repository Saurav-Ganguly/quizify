
'use server';
/**
 * @fileOverview Generates multiple-choice questions (MCQs) and exam-focused notes from the text content of a single PDF page.
 *
 * - generateMcqsForPage - A function that handles the MCQ and notes generation for a single page.
 * - GenerateMcqsForPageInput - The input type for the generateMcqsForPage function.
 * - GenerateMcqsForPageOutput - The return type for the generateMcqsForPage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const McqSchema = z.object({
  question: z.string().describe('The multiple-choice question.'),
  options: z.array(z.string()).length(4).describe('The four options for the question. Three should be plausible but incorrect distractors, and one correct.'),
  correctAnswerIndex: z.number().min(0).max(3).describe('The 0-indexed correct answer in the options array.'),
  explanation: z.string().describe('The detailed, step-by-step, and pedagogical explanation of why the correct answer is correct and why the distractors are incorrect. This explanation should be well-formatted for readability (e.g., using paragraphs, bullet points, and bold text for emphasis).'),
});

const GenerateMcqsForPageInputSchema = z.object({
  pageText: z.string().describe('The text content of a single PDF page.'),
  subject: z.string().describe('The subject of the PDF document.'),
  pageNumber: z.number().describe('The current page number being processed.'),
  totalPages: z.number().describe('The total number of pages in the document.'),
});
export type GenerateMcqsForPageInput = z.infer<typeof GenerateMcqsForPageInputSchema>;

const GenerateMcqsForPageOutputSchema = z.object({
  mcqs: z.array(McqSchema).describe('The generated multiple-choice questions with explanations for this page.'),
  pageNotes: z.string().describe('Concise, exam-focused notes for this page, highlighting the most important concepts, definitions, and key takeaways. Aim for 2-5 bullet points or short paragraphs per page. Format for readability, using bullet points, paragraphs, and bold text for keywords.'),
});
export type GenerateMcqsForPageOutput = z.infer<typeof GenerateMcqsForPageOutputSchema>;

export async function generateMcqsForPage(
  input: GenerateMcqsForPageInput
): Promise<GenerateMcqsForPageOutput> {
  return generateMcqsForPageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMcqsForPagePrompt',
  input: {schema: GenerateMcqsForPageInputSchema},
  output: {schema: GenerateMcqsForPageOutputSchema},
  prompt: `You are an expert quiz creator and subject matter specialist. You are provided with the text content of page {{pageNumber}} from a {{totalPages}}-page document on the subject of '{{{subject}}}'.

The text for this page is:
\`\`\`
{{{pageText}}}
\`\`\`

Your tasks are twofold for THIS PAGE:

TASK 1: Generate Multiple-Choice Questions (MCQs)
Generate exactly 5 high-quality, distinct Multiple-Choice Questions (MCQs) based *exclusively* on the provided text content from THIS PAGE.
For each MCQ, you MUST provide:
1.  **A clear and unambiguous question.**
2.  **Exactly four options:**
    *   One option that is clearly and unequivocally the correct answer based on the provided text.
    *   Three distractor options that are **plausible but definitively incorrect**. These distractors should be related to the topic and designed to make the question challenging, not trivially easy. They could represent common misconceptions, closely related but distinct concepts, or subtly incorrect statements. Avoid options that are obviously absurd or unrelated.
3.  **The 0-indexed integer for \`correctAnswerIndex\`** indicating which of the four options is correct.
4.  **A detailed, step-by-step, and pedagogical \`explanation\`**:
    *   This explanation should be comprehensive enough that a student can understand *why* the correct answer is correct.
    *   If applicable, briefly explain *why* the key distractor(s) are incorrect.
    *   The explanation MUST be **well-formatted for maximum readability**. This means:
        *   Use clear paragraphs to separate distinct ideas or steps.
        *   Employ bullet points or numbered lists for sequential information, multiple reasons, or key takeaways (e.g., use '*' or '-' for bullets, '1.', '2.' for numbered lists).
        *   Use **bold text** (e.g., by enclosing in asterisks like *this*) to highlight crucial terms, keywords, or parts of the explanation.

TASK 2: Generate Exam-Focused Notes
In ADDITION to the MCQs, you MUST also generate concise, exam-focused notes for THIS PAGE.
*   These notes should summarize the **most important concepts, definitions, and key takeaways relevant for an exam** present in the page text.
*   Aim for **2-5 clear bullet points or short paragraphs** for the notes section.
*   The notes MUST be **well-formatted for readability and engagement**. This means:
    *   Use **clear paragraphs** to separate distinct ideas or topics.
    *   Employ **bullet points (e.g., starting lines with '*' or '-') or numbered lists** for key points, lists of information, or important takeaways.
    *   Use **bold text (e.g., by enclosing in asterisks like *this*)** to highlight crucial terms, keywords, or important phrases within the notes.
    *   Structure the notes logically, perhaps by topic or concept found on the page.

CRITICAL JSON FORMATTING RULES:
1.  Your entire response MUST be a single, valid JSON object.
2.  The JSON object MUST contain two top-level keys: "mcqs" and "pageNotes".
3.  The value of "mcqs" MUST be an array of MCQ objects.
4.  EVERY MCQ object within the \`mcqs\` array MUST be COMPLETE and contain ALL FOUR required fields: \`question\` (string), \`options\` (array of 4 strings), \`correctAnswerIndex\` (number, 0-3), and \`explanation\` (string). Ensure the data types are correct as specified and that no field is empty or missing.
5.  The 'mcqs' array for this page MUST contain exactly 5 such MCQ objects. Do not generate more or less than 5.
6.  The value of "pageNotes" MUST be a single string containing the exam-focused notes for the page, with formatting (bullet points, paragraphs, bold indicators) embedded within the string.

Example of the overall JSON object structure (content will vary based on the provided text):
{
  "mcqs": [
    {
      "question": "What is the primary function of X according to the text?",
      "options": ["Plausible Distractor A", "Correct Answer B", "Plausible Distractor C", "Plausible Distractor D"],
      "correctAnswerIndex": 1,
      "explanation": "The text states that X's primary function is B because... Let's break this down:\\n\\n*Why B is Correct:*\\n1. Evidence point 1 from the text supporting B.\\n2. Evidence point 2 from the text supporting B.\\n\\n*Why Other Options are Incorrect:*\\n- Option A is incorrect because the text indicates...\\n- Option C, while related, is not the *primary* function described..."
    }
    // ... (4 more MCQ objects)
  ],
  "pageNotes": "*Key Concept 1:* X is defined as... This is important for understanding *Y*.\\n\\nMain Takeaway for Page {{pageNumber}}:\\n- The process of V involves steps A, B, and C.\\n- It's crucial to remember the distinction between X and Z."
}

VERY IMPORTANT FINAL CHECK: Ensure the last MCQ object in the 'mcqs' array is complete and valid, and that all 5 MCQs are present and correctly formatted. Also ensure the 'pageNotes' field is present and contains the generated notes as a string with the requested formatting.
Focus on high-quality questions, plausible distractors, comprehensive, well-formatted explanations, and concise, well-formatted, exam-relevant notes.
`,
});

const generateMcqsForPageFlow = ai.defineFlow(
  {
    name: 'generateMcqsForPageFlow',
    inputSchema: GenerateMcqsForPageInputSchema,
    outputSchema: GenerateMcqsForPageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output && Array.isArray(output.mcqs) && typeof output.pageNotes === 'string') {
        return output;
    }
    // Fallback if output is malformed
    console.warn('AI output for page generation was malformed, returning empty MCQs and notes for this page.', input);
    return { mcqs: [], pageNotes: '' };
  }
);

