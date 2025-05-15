
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { getQuizzes, getQuizAttempts } from '@/lib/quiz-store';
import type { Quiz, QuizAttempt } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, CheckSquare, BookOpen, Percent, TrendingUp, Activity } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface SubjectProgress {
  subject: string;
  quizzesTaken: number;
  averageScore: number;
  totalCorrect: number;
  totalAttemptedQuestions: number;
}

export default function ProgressPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    setQuizzes(getQuizzes());
    setAttempts(getQuizAttempts());
  }, []);

  const totalQuizzesCreated = quizzes.length;
  const totalAttemptsMade = attempts.length;
  
  const overallAverageScore = useMemo(() => {
    if (attempts.length === 0) return 0;
    const totalScore = attempts.reduce((sum, attempt) => sum + (attempt.score / attempt.totalQuestions), 0);
    return Math.round((totalScore / attempts.length) * 100);
  }, [attempts]);

  const subjectProgress = useMemo(() => {
    const progressMap: Record<string, { totalScoreSum: number; quizzesTaken: number; totalCorrect: number; totalAttemptedQuestions: number }> = {};

    attempts.forEach(attempt => {
      const quiz = quizzes.find(q => q.id === attempt.quizId);
      if (quiz) {
        if (!progressMap[quiz.subject]) {
          progressMap[quiz.subject] = { totalScoreSum: 0, quizzesTaken: 0, totalCorrect: 0, totalAttemptedQuestions: 0 };
        }
        progressMap[quiz.subject].totalScoreSum += (attempt.score / attempt.totalQuestions);
        progressMap[quiz.subject].quizzesTaken += 1;
        progressMap[quiz.subject].totalCorrect += attempt.score;
        progressMap[quiz.subject].totalAttemptedQuestions += attempt.totalQuestions;
      }
    });

    return Object.entries(progressMap).map(([subject, data]) => ({
      subject,
      quizzesTaken: data.quizzesTaken,
      averageScore: data.quizzesTaken > 0 ? Math.round((data.totalScoreSum / data.quizzesTaken) * 100) : 0,
      totalCorrect: data.totalCorrect,
      totalAttemptedQuestions: data.totalAttemptedQuestions,
    })).sort((a, b) => b.averageScore - a.averageScore);
  }, [quizzes, attempts]);
  
  const chartConfig = {
    averageScore: {
      label: "Average Score (%)",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  if (totalQuizzesCreated === 0 && totalAttemptsMade === 0) {
     return (
      <div className="text-center py-10">
        <BarChart3 className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
        <h2 className="text-2xl font-semibold mb-2">No Progress Yet</h2>
        <p className="text-muted-foreground">
          Take some quizzes to see your progress here.
        </p>
      </div>
    );
  }


  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Your Progress</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Created</CardTitle>
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuizzesCreated}</div>
            <p className="text-xs text-muted-foreground">Total number of quizzes you've generated.</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Attempted</CardTitle>
            <CheckSquare className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAttemptsMade}</div>
            <p className="text-xs text-muted-foreground">Total quiz attempts made so far.</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Average Score</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallAverageScore}%</div>
            <p className="text-xs text-muted-foreground">Average score across all attempts.</p>
          </CardContent>
        </Card>
      </div>

      {subjectProgress.length > 0 && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                Performance by Subject
            </CardTitle>
            <CardDescription>Average scores for each subject you've taken quizzes on.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectProgress} margin={{ top: 5, right: 20, left: -20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="subject" 
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Bar dataKey="averageScore" fill="var(--color-averageScore)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
       {subjectProgress.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Subject Details</CardTitle>
            <CardDescription>Detailed breakdown of your performance in each subject.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjectProgress.map(subjectData => (
                <div key={subjectData.subject} className="p-4 border rounded-md">
                  <h3 className="text-lg font-semibold text-primary">{subjectData.subject}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-sm">
                    <p>Avg Score: <span className="font-medium">{subjectData.averageScore}%</span></p>
                    <p>Quizzes Taken: <span className="font-medium">{subjectData.quizzesTaken}</span></p>
                    <p>Correct: <span className="font-medium">{subjectData.totalCorrect} / {subjectData.totalAttemptedQuestions}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
       )}
    </div>
  );
}

