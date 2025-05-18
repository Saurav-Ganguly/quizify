
"use client";
// This page is no longer used as Quick Quiz is integrated into the main quiz page.
// It can be deleted or kept as a reference if needed.

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DeprecatedQuickQuizPage() {
  return (
    <div className="container mx-auto py-10 flex justify-center">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-6 w-6 text-primary" />
            Quick Quiz Feature Updated
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <CardDescription>
            The "Quick Quiz" feature has been moved! You can now find it as a tab
            within each individual quiz page (under "My Quizzes").
          </CardDescription>
          <Button asChild>
            <Link href="/quizzes">
              Go to My Quizzes
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
