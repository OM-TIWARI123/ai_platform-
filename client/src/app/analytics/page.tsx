'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Analytics from '../../components/Analytics';

interface EvaluationResponse {
  overall_score: number;
  overall_feedback: string;
  question_analysis: Array<{
    question_id: number;
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }>;
  analytics: {
    total_duration: string;
    average_response_time: number;
    speaking_pace: string;
    technical_depth: string;
    communication_clarity: string;
  };
  recommendations: string[];
}

export default function AnalyticsPage() {
  const [evaluationResults, setEvaluationResults] = useState<EvaluationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get evaluation results from sessionStorage
    const storedResults = sessionStorage.getItem('evaluationResults');
    
    if (!storedResults) {
      // If no evaluation results, redirect to home
      router.push('/');
      return;
    }

    try {
      const results: EvaluationResponse = JSON.parse(storedResults);
      setEvaluationResults(results);
    } catch (error) {
      console.error('Error parsing evaluation results:', error);
      router.push('/');
      return;
    }
    
    setIsLoading(false);
  }, [router]);

  const handleStartOver = () => {
    // Clear all stored data and navigate to home
    sessionStorage.removeItem('interviewData');
    sessionStorage.removeItem('evaluationResults');
    router.push('/');
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Loading Analytics...</h2>
        <p>Please wait while we prepare your results...</p>
      </div>
    );
  }

  if (!evaluationResults) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>No Analytics Data Found</h2>
        <p>Redirecting to home page...</p>
      </div>
    );
  }

  return (
    <Analytics
      results={evaluationResults}
      onStartOver={handleStartOver}
    />
  );
}