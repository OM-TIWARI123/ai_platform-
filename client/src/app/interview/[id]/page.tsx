'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Interview from '../../../components/Interview';

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

interface TransitionData {
  text: string;
}

interface InitializeResponse {
  session_id: string;
  intro_message: string;
  questions: QuestionData[];
  transitions: TransitionData[];
}

interface SubmitInterviewResponse {
  session_id: string;
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
    consistency_score?: number;
  };
  recommendations: string[];
}

export default function InterviewPage() {
  const [interviewData, setInterviewData] = useState<InitializeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>('');
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string; // Changed from params.userId to params.id

  useEffect(() => {
    // Get initialization data from localStorage
    const storedInitData = localStorage.getItem('interviewInitData');
    
    if (!storedInitData) {
      // If no initialization data, redirect to home
      console.log('No initialization data found, redirecting to home');
      router.push(`/${userId}`);
      return;
    }

    try {
      const initData = JSON.parse(storedInitData);
      console.log('Found initialization data:', { role: initData.role, userId: initData.userId });
      
      // Verify userId matches
      if (initData.userId !== userId) {
        console.log('User ID mismatch, redirecting to home');
        localStorage.removeItem('interviewInitData');
        router.push(`/${userId}`);
        return;
      }
      
      setCurrentRole(initData.role);
      
      // Initialize interview automatically
      initializeInterview(initData.role, initData.resumeContent);
    } catch (error) {
      console.error('Error parsing initialization data:', error);
      localStorage.removeItem('interviewInitData');
      router.push(`/${userId}`);
      return;
    }
  }, [router, userId]);

  const initializeInterview = async (role: string, resumeContent: string) => {
    setIsLoading(true);
    
    try {
      console.log('Initializing interview with role:', role);
      console.log(resumeContent)
      const response = await fetch('http://localhost:3000/api/interview/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          resume_content: resumeContent,
        }),
      });
      console.log(response)
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Initialize API error:', errorData);
        throw new Error(errorData.error || 'Failed to initialize interview');
      }

      const data: InitializeResponse = await response.json();
      console.log('Interview initialized successfully:', { 
        session_id: data.session_id, 
        questions_count: data.questions.length 
      });
      
      setInterviewData(data);
      
      // Clean up initialization data
      localStorage.removeItem('interviewInitData');
      
    } catch (error) {
      console.error('Error initializing interview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.log(errorMessage)
      alert(`Failed to initialize interview: ${errorMessage}. Please try again.`);
      
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterviewComplete = async (qaData: InterviewData[]) => {
    if (!interviewData || !userId) {
      console.error('Missing data for interview submission:', { interviewData: !!interviewData, userId });
      return;
    }

    setIsLoading(true);
    console.log('Submitting interview:', { 
      session_id: interviewData.session_id, 
      userId, 
      qa_count: qaData.length 
    });

    try {
      const response = await fetch('http://localhost:3000/api/interview/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: interviewData.session_id,
          userId: userId,
          interview_data: qaData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Submit API error:', errorData);
        throw new Error(errorData.error || 'Failed to submit interview');
      }

      const results: SubmitInterviewResponse = await response.json();
      console.log('Interview submitted successfully:', { 
        session_id: results.session_id, 
        overall_score: results.overall_score 
      });
      
      // Store results temporarily for analytics page
      const resultsData = {
        session_id: results.session_id,
        overall_score: results.overall_score,
        overall_feedback: results.overall_feedback,
        question_analysis: results.question_analysis,
        analytics: results.analytics,
        recommendations: results.recommendations,
        role: currentRole, // Include role for analytics page
      };
      
      localStorage.setItem('evaluationResults', JSON.stringify(resultsData));
      
      // Navigate to analytics/results page
      router.push(`/analytics`);
      
    } catch (error) {
      console.error('Error submitting interview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to submit interview: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#333' }}>
            {interviewData ? 'Evaluating Your Interview...' : 'Preparing Your Interview...'}
          </h2>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 2s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
        <p style={{ color: '#666' }}>
          {interviewData 
            ? 'Please wait while we analyze your responses and generate detailed feedback...' 
            : 'Please wait while we analyze your resume and generate personalized questions...'
          }
        </p>
        {currentRole && (
          <p style={{ color: '#888', fontSize: '14px', marginTop: '10px' }}>
            Role: {currentRole}
          </p>
        )}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!interviewData) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Arial, sans-serif' }}>
        <h2 style={{ color: '#333' }}>Setting Up Your Interview...</h2>
        <p style={{ color: '#666' }}>Please wait while we prepare your personalized interview questions...</p>
        {currentRole && (
          <p style={{ color: '#888', fontSize: '14px', marginTop: '10px' }}>
            Role: {currentRole}
          </p>
        )}
      </div>
    );
  }

  return (
    <Interview
      interviewData={interviewData}
      onComplete={handleInterviewComplete}
      onBack={() => {
        localStorage.removeItem('interviewInitData');
        localStorage.removeItem('evaluationResults');
        router.push(`/${userId}`);
      }}
    />
  );
}