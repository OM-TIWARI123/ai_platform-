export interface Question {
    id: string;
    text: string;
    category: string;
    difficulty: number;
    context?: string;
}

export interface Transition {
    from_question: string;
    to_question: string;
    text: string;
}

export interface InterviewSession {
    session_id: string;
    intro_message: string;
    questions: Question[];
    transitions: Transition[];
}

export interface InterviewResponse {
    question_id: string;
    audio_url?: string;
    transcript?: string;
    evaluation?: {
        score: number;
        feedback: string;
    };
}

export type InterviewState = 'idle' | 'recording' | 'processing' | 'evaluating' | 'complete';
