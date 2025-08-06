'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Interview from '../../components/Interview';
import { createEvaluation } from '../actions/evaluation';

interface InterviewData {
  question_id: number;
  question_text: string;
  answer_text: string;
  answer_duration: number;
}

interface QuestionData {
  id: number;
  text: string;
}

interface InitializeResponse {
  session_id: string;
  intro_message: string;
  questions: QuestionData[];
  transitions: string[];
}

export default function InterviewPage() {
  const [interviewData, setInterviewData] = useState<InitializeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get interview data from sessionStorage
    const storedData = sessionStorage.getItem('interviewData');
    
    if (!storedData) {
      // If no interview data, redirect to home
      router.push('/');
      return;
    }

    try {
      const data: InitializeResponse = JSON.parse(storedData);
      setInterviewData(data);
    } catch (error) {
      console.error('Error parsing interview data:', error);
      router.push('/');
      return;
    }
    
    setIsLoading(false);
  }, [router]);

  const handleInterviewComplete = async (qaData: InterviewData[]) => {
    if (!interviewData) return;

    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/interview/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: interviewData.session_id,
          interview_data: qaData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit interview');
      }

      const submitData = await response.json();
      
      // Poll for results
      const pollResults = async () => {
        const resultsResponse = await fetch(`http://127.0.0.1:8000/api/interview/results/${submitData.evaluation_id}`);
        if (resultsResponse.ok) {
          const results = await resultsResponse.json();
          
          // Store results in sessionStorage for analytics page
          sessionStorage.setItem('evaluationResults', JSON.stringify(results));
          
          // Store evaluation in database using server action
          const evaluationResult = await createEvaluation({
            evaluation_id: submitData.evaluation_id,
            session_id: interviewData.session_id,
            role: 'Product Manager', // You might want to get this from interviewData
            interview_data: qaData,
            submitted_at: Date.now() / 1000,
            status: 'completed',
            results: results,
            completed_at: Date.now() / 1000,
          });
          
          if (evaluationResult.status !== 200) {
            console.error('Failed to store evaluation in database:', evaluationResult.error);
          }
          
          // Navigate to analytics page
          router.push('/analytics');
        } else {
          // Keep polling if results aren't ready
          setTimeout(pollResults, 2000);
        }
      };

      setTimeout(pollResults, 1000);
    } catch (error) {
      console.error('Error submitting interview:', error);
      alert('Failed to submit interview. Please try again.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Loading Interview...</h2>
        <p>Please wait while we prepare your interview...</p>
      </div>
    );
  }

  if (!interviewData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>No Interview Data Found</h2>
        <p>Redirecting to home page...</p>
      </div>
    );
  }

  return (
    <Interview
      interviewData={interviewData}
      onComplete={handleInterviewComplete}
      onBack={() => {
        sessionStorage.removeItem('interviewData');
        router.push('/');
      }}
    />
  );
}