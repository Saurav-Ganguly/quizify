
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, BarChart3, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import type { Quiz, QuizAttempt } from "@/lib/types";
import Link from "next/link";

interface QuizResultSummaryProps {
  quiz: Quiz;
  attempt: QuizAttempt;
  onRetake: () => void;
}

export function QuizResultSummary({ quiz, attempt, onRetake }: QuizResultSummaryProps) {
  const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
  let feedbackMessage = "";
  let feedbackColor = "";

  if (percentage >= 80) {
    feedbackMessage = "Excellent work! You have a strong understanding of the material.";
    feedbackColor = "text-green-600";
  } else if (percentage >= 60) {
    feedbackMessage = "Good job! You're doing well, but there's room for improvement.";
    feedbackColor = "text-yellow-600";
  } else {
    feedbackMessage = "Keep practicing! Review the explanations to improve your understanding.";
    feedbackColor = "text-red-600";
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader className="text-center">
        <Award className="mx-auto h-16 w-16 text-primary mb-4" />
        <CardTitle className="text-3xl">Quiz Completed!</CardTitle>
        <CardDescription>Here's your performance for "{quiz.subject}".</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-5xl font-bold text-primary">{percentage}%</p>
          <p className="text-lg text-muted-foreground">Your Score</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-3xl font-semibold">{attempt.score}</p>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" /> Correct Answers
            </p>
          </div>
          <div>
            <p className="text-3xl font-semibold">{attempt.totalQuestions - attempt.score}</p>
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
              <XCircle className="h-4 w-4 text-red-500" /> Incorrect Answers
            </p>
          </div>
        </div>

        <p className={`text-center text-sm ${feedbackColor}`}>{feedbackMessage}</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button onClick={onRetake} variant="outline" size="lg">
            <RotateCcw className="mr-2 h-4 w-4" /> Retake Quiz
          </Button>
          <Button asChild size="lg">
            <Link href="/quizzes">
              <BarChart3 className="mr-2 h-4 w-4" /> View All Quizzes
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
