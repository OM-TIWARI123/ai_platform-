// src/app/api/types/interview.ts

export interface QuestionData {
  id: number;
  text: string;
}

export interface TransitionData {
  text: string;
}

export interface InitializeResponse {
  session_id: string;
  intro_message: string;
  questions: QuestionData[];
  transitions: TransitionData[];
}

export interface QuestionAnswer {
  question_id: number;
  question_text: string;
  answer_text: string;
  answer_duration: number; // in seconds
}

export interface SubmitInterviewRequest {
  session_id: string;
  interview_data: QuestionAnswer[];
}

export interface SubmitInterviewResponse {
  evaluation_id: string;
  message: string;
}

export interface QuestionAnalysis {
  question_id: number;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export interface Analytics {
  total_duration: string;
  average_response_time: number;
  speaking_pace: string;
  technical_depth: string;
  communication_clarity: string;
  consistency_score?: number;
}

export interface ResultsResponse {
  overall_score: number;
  overall_feedback: string;
  question_analysis: QuestionAnalysis[];
  analytics: Analytics;
  recommendations: string[];
}