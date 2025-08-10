// src/app/api/interview/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SubmitInterviewRequestSchema } from '../../../lib/models/request-models';
import { SubmitInterviewResponse, ErrorResponse } from '../../../lib/models/response-models';
import { EvaluationService } from '../../../lib/services/evaluation-service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('Entering submit interview endpoint');
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = SubmitInterviewRequestSchema.parse(body);
    
    console.log('Validated submit request:', { 
      session_id: validatedData.session_id, 
      userId: validatedData.userId,
      interview_data_count: validatedData.interview_data.length 
    });

    // Extract role from the first question or use default
    // Note: You might want to pass role explicitly in the request
    const role = extractRoleFromQuestions(validatedData.interview_data) || 'Product Manager';
    
    // Initialize evaluation service
    const evaluationService = new EvaluationService();

    // Run evaluation synchronously
    console.log('Starting evaluation...');
    const evaluationResults = await evaluationService.evaluateCompleteInterview(
      validatedData.interview_data,
      role
    );

    console.log('Evaluation completed, storing in database...');

    // Store evaluation in database
    const evaluation = await prisma.evaluation.create({
      data: {
        session_id: validatedData.session_id,
        role: role,
        interview_data: validatedData.interview_data,
        submitted_at: Date.now() / 1000,
        status: 'completed',
        results: JSON.parse(JSON.stringify(evaluationResults)),
        completed_at: Date.now() / 1000,
        userId: validatedData.userId,
      }
    });

    console.log('Successfully stored evaluation:', evaluation.id);

    // Return evaluation results
    const response: SubmitInterviewResponse = {
      session_id: validatedData.session_id,
      overall_score: evaluationResults.overall_score,
      overall_feedback: evaluationResults.overall_feedback,
      question_analysis: evaluationResults.question_analysis,
      analytics: evaluationResults.analytics,
      recommendations: evaluationResults.recommendations,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error submitting interview:', error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError: ErrorResponse = {
        error: 'Validation failed',
        detail: 'Invalid request data provided'
      };
      return NextResponse.json(validationError, { status: 400 });
    }

    // Handle database errors
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError: ErrorResponse = {
        error: 'Database error',
        detail: 'Failed to store evaluation results'
      };
      return NextResponse.json(dbError, { status: 500 });
    }

    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Helper function to extract role from interview questions
function extractRoleFromQuestions(interviewData: any[]): string | null {
  // Look for role-specific keywords in questions
  const allQuestions = interviewData.map(qa => qa.question_text.toLowerCase()).join(' ');
  
  if (allQuestions.includes('software') || allQuestions.includes('programming') || allQuestions.includes('coding')) {
    return 'SDE';
  } else if (allQuestions.includes('data science') || allQuestions.includes('machine learning') || allQuestions.includes('analytics')) {
    return 'Data Scientist';
  } else if (allQuestions.includes('product') || allQuestions.includes('stakeholder') || allQuestions.includes('roadmap')) {
    return 'Product Manager';
  }
  
  return null;
}