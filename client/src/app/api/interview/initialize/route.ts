// src/app/api/interview/initialize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { InitializeRequestSchema } from '../../../lib/models/request-models';
import { InitializeResponse, ErrorResponse } from '../../../lib/models/response-models';
import { QuestionGenerator } from '../../../lib/services/question-generator';
import { TransitionGenerator } from '../../../lib/services/transition-generator';

export async function POST(request: NextRequest) {
  try {
    console.log('Entering initialize endpoint');
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = InitializeRequestSchema.parse(body);
    
    console.log('Validated request data:', { role: validatedData.role });

    // Generate unique session ID
    const sessionId = uuidv4();
    console.log('Generated session ID:', sessionId);

    // Initialize services
    const questionGenerator = new QuestionGenerator();
    const transitionGenerator = new TransitionGenerator();

    // Generate contextual questions based on resume content
    console.log('Generating questions...');
    const questionsList = await questionGenerator.generateQuestions(
      validatedData.resume_content,
      validatedData.role
    );

    // Create question objects with IDs
    const questions = questionsList.map((q, index) => ({
      id: index + 1,
      text: q
    }));

    // Generate intro message
    console.log('Generating intro message...');
    const introMessage = await questionGenerator.generateIntroMessage(validatedData.role);

    // Generate transition phrases
    console.log('Generating transitions...');
    const transitionsList = await transitionGenerator.generateTransitions(questions.length);
    const transitions = transitionsList.map(t => ({ text: t }));

    const response: InitializeResponse = {
      session_id: sessionId,
      intro_message: introMessage,
      questions,
      transitions
    };

    console.log('Successfully initialized interview with', questions.length, 'questions');
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error initializing interview:', error);
    
    // Handle validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError: ErrorResponse = {
        error: 'Validation failed',
        detail: 'Invalid request data provided'
      };
      return NextResponse.json(validationError, { status: 400 });
    }

    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}