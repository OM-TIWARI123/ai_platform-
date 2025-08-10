// src/lib/services/question-generator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

interface InterviewQuestions {
  questions: string[];
}

export class QuestionGenerator {
  private llm: ChatGoogleGenerativeAI;
  private roleQueries: Record<string, string[]>;

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      apiKey: process.env.GOOGLE_API_KEY!,
    });

    this.roleQueries = {
      'SDE': [
        'programming languages projects software development',
        'technical skills algorithms data structures',
        'system design architecture frameworks'
      ],
      'Data Scientist': [
        'data analysis machine learning models',
        'statistics python R SQL databases',
        'visualization analytics business insights'
      ],
      'Product Manager': [
        'product management stakeholder business',
        'project management leadership team',
        'metrics KPIs user research strategy'
      ]
    };
  }

  async generateQuestions(resumeContent: string, role: string): Promise<string[]> {
    try {
      console.log(`Generating questions for role: ${role}`);

      if (!resumeContent.trim()) {
        console.warn('No resume content provided, using fallback questions');
        return this.getGenericQuestions(role);
      }

      const prompt = `Based on the candidate's resume content and the role of ${role}, generate exactly 5 specific interview questions.

Resume content:
${resumeContent}

Role: ${role}

Generate 5 specific questions that:
1. Reference specific points from their resume content
2. Are highly relevant to the ${role} role
3. Allow the candidate to elaborate on their experience
4. Help assess their skills and expertise for this specific role
5. Are personalized based on their background

Return exactly 5 questions, one per line, numbered 1-5.

Important: Generate exactly 5 questions based on the resume content.`;

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;
      
      const questions = content
        .split('\n')
        .map(q => q.trim().replace(/^\d+\.\s*/, ''))
        .filter(q => q.length > 0)
        .slice(0, 5);

      // Ensure we have exactly 5 questions
      while (questions.length < 5) {
        const genericQuestions = this.getGenericQuestions(role);
        questions.push(...genericQuestions.slice(questions.length, 5));
      }

      console.log(`Generated ${questions.length} questions successfully`);
      return questions.slice(0, 5);

    } catch (error) {
      console.error('Error in question generation:', error);
      return this.getGenericQuestions(role);
    }
  }

  async generateIntroMessage(role: string): Promise<string> {
    try {
      const prompt = `You are an AI interviewer conducting a ${role} interview. 
      Generate a warm, professional greeting that:
      1. Welcomes the candidate
      2. Briefly explains what will happen in the interview
      3. Encourages them to relax and be themselves
      4. Asks them to introduce themselves
      
      Keep it conversational and friendly, around 2-3 sentences.`;

      const response = await this.llm.invoke(prompt);
      return (response.content as string).trim();

    } catch (error) {
      console.error('Error generating intro message:', error);
      return `Welcome to your ${role} interview! I'm excited to learn more about your background and experience. Please start by introducing yourself and telling me a bit about your professional journey.`;
    }
  }

  private getGenericQuestions(role: string): string[] {
    const genericQuestions: Record<string, string[]> = {
      'SDE': [
        'Tell me about a challenging software development project you\'ve worked on.',
        'How do you approach debugging complex technical issues?',
        'Describe your experience with software design patterns and architecture.',
        'How do you ensure code quality and maintainability in your projects?',
        'What\'s your approach to learning new technologies and frameworks?'
      ],
      'Data Scientist': [
        'Describe a data science project where you had to work with messy or incomplete data.',
        'How do you approach feature selection and engineering in your models?',
        'Tell me about a time when you had to explain complex analytical findings to non-technical stakeholders.',
        'What\'s your process for evaluating and validating machine learning models?',
        'How do you stay current with new developments in data science and machine learning?'
      ],
      'Product Manager': [
        'Describe how you prioritize features when building a product roadmap.',
        'Tell me about a time when you had to make a difficult product decision with limited data.',
        'How do you gather and incorporate user feedback into product development?',
        'Describe your approach to working with cross-functional teams.',
        'How do you measure product success and define key performance indicators?'
      ]
    };

    return genericQuestions[role] || [
      'Tell me about your professional background.',
      'What interests you about this role?',
      'Describe a challenging project you\'ve worked on.',
      'How do you handle difficult situations at work?',
      'What are your career goals?'
    ];
  }
}