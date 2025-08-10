// src/lib/services/evaluation-service.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { QuestionAnalysis, Analytics } from '../models/response-models';
import { InterviewAnswer } from '../models/request-models';

interface EvaluationResult {
  overall_score: number;
  overall_feedback: string;
  question_analysis: QuestionAnalysis[];
  analytics: Analytics;
  recommendations: string[];
}

export class EvaluationService {
  private llm: ChatGoogleGenerativeAI;

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      apiKey: process.env.GOOGLE_API_KEY!,
    });
  }

  async evaluateCompleteInterview(
    qaData: InterviewAnswer[],
    role: string
  ): Promise<EvaluationResult> {
    try {
      console.log(`Evaluating interview for role: ${role}`);

      // Individual question evaluations
      const questionAnalyses: QuestionAnalysis[] = [];
      const individualScores: number[] = [];

      for (const qa of qaData) {
        const analysis = await this.evaluateSingleAnswer(
          qa.question_text,
          qa.answer_text,
          role,
          qa.question_id
        );
        questionAnalyses.push(analysis);
        individualScores.push(analysis.score);
      }

      // Calculate analytics
      const analytics = this.calculateAnalytics(qaData, individualScores);

      // Cross-question analysis
      const consistencyScore = await this.analyzeConsistency(qaData);
      analytics.consistency_score = consistencyScore;

      // Calculate overall score
      const overallScore = this.calculateOverallScore(individualScores, analytics);

      // Generate overall feedback
      const overallFeedback = await this.generateOverallFeedback(
        qaData,
        individualScores,
        analytics,
        role
      );

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        questionAnalyses,
        analytics,
        role
      );

      return {
        overall_score: Math.round(overallScore * 10) / 10,
        overall_feedback:overallFeedback,
        question_analysis: questionAnalyses,
        analytics,
        recommendations,
      };

    } catch (error) {
      console.error('Error evaluating interview:', error);
      throw new Error(`Failed to evaluate interview: ${error}`);
    }
  }

  private async evaluateSingleAnswer(
    question: string,
    answer: string,
    role: string,
    questionId: number
  ): Promise<QuestionAnalysis> {
    try {
      const prompt = `You are evaluating a ${role} interview answer. Provide a detailed assessment.

Question: ${question}
Answer: ${answer}

Evaluate this answer on a scale of 0-10 and provide:
1. A numeric score (0-10)
2. Detailed feedback (2-3 sentences)
3. Key strengths (list up to 3)
4. Areas for improvement (list up to 3)

Format your response as:
SCORE: [number]
FEEDBACK: [detailed feedback]
STRENGTHS: [strength1] | [strength2] | [strength3]
IMPROVEMENTS: [improvement1] | [improvement2] | [improvement3]

If any section has fewer items, just list what applies.`;

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      // Parse response
      let score = 5.0; // default
      let feedback = 'Unable to generate detailed feedback.';
      let strengths: string[] = [];
      let improvements: string[] = [];

      const lines = content.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('SCORE:')) {
          try {
            const scoreStr = trimmedLine.split(':', 1)[1]?.trim();
            if (scoreStr) {
              score = Math.max(0, Math.min(10, parseFloat(scoreStr)));
            }
          } catch {
            // Keep default score
          }
        } else if (trimmedLine.startsWith('FEEDBACK:')) {
          feedback = trimmedLine.split(':', 1)[1]?.trim() || feedback;
        } else if (trimmedLine.startsWith('STRENGTHS:')) {
          const strengthsText = trimmedLine.split(':', 1)[1]?.trim();
          if (strengthsText && strengthsText !== 'None') {
            strengths = strengthsText.split('|').map(s => s.trim()).filter(s => s.length > 0);
          }
        } else if (trimmedLine.startsWith('IMPROVEMENTS:')) {
          const improvementsText = trimmedLine.split(':', 1)[1]?.trim();
          if (improvementsText && improvementsText !== 'None') {
            improvements = improvementsText.split('|').map(i => i.trim()).filter(i => i.length > 0);
          }
        }
      }

      return {
        question_id: questionId,
        score,
        feedback,
        strengths,
        improvements,
      };

    } catch (error) {
      console.error('Error evaluating single answer:', error);
      return {
        question_id: questionId,
        score: 5.0,
        feedback: 'Unable to evaluate this response due to a technical issue.',
        strengths: [],
        improvements: ['Technical evaluation error occurred'],
      };
    }
  }

  private calculateAnalytics(qaData: InterviewAnswer[], scores: number[]): Analytics {
    try {
      const totalDuration = qaData.reduce((sum, qa) => sum + qa.answer_duration, 0);
      const avgResponseTime = qaData.length > 0 
        ? qaData.reduce((sum, qa) => sum + qa.answer_duration, 0) / qaData.length 
        : 0;

      // Assess speaking pace
      const wordsPerAnswer: number[] = [];
      for (const qa of qaData) {
        const wordCount = qa.answer_text.split(/\s+/).length;
        if (qa.answer_duration > 0) {
          const wpm = (wordCount / qa.answer_duration) * 60;
          wordsPerAnswer.push(wpm);
        }
      }

      const avgWpm = wordsPerAnswer.length > 0 
        ? wordsPerAnswer.reduce((sum, wpm) => sum + wpm, 0) / wordsPerAnswer.length 
        : 120;

      let speakingPace: string;
      if (avgWpm < 100) {
        speakingPace = 'Slow';
      } else if (avgWpm > 180) {
        speakingPace = 'Fast';
      } else {
        speakingPace = 'Normal';
      }

      // Assess technical depth
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      let technicalDepth: string;
      if (avgScore >= 8) {
        technicalDepth = 'High';
      } else if (avgScore >= 6) {
        technicalDepth = 'Medium';
      } else {
        technicalDepth = 'Low';
      }

      // Assess communication clarity
      const totalWords = qaData.reduce((sum, qa) => sum + qa.answer_text.split(/\s+/).length, 0);
      const avgWordsPerAnswer = totalWords / qaData.length;

      let communicationClarity: string;
      if (avgWordsPerAnswer >= 50 && avgScore >= 7) {
        communicationClarity = 'Excellent';
      } else if (avgWordsPerAnswer >= 30 && avgScore >= 6) {
        communicationClarity = 'Good';
      } else if (avgWordsPerAnswer >= 20) {
        communicationClarity = 'Fair';
      } else {
        communicationClarity = 'Needs Improvement';
      }

      // Format duration
      const minutes = Math.floor(totalDuration / 60);
      const seconds = Math.floor(totalDuration % 60);
      const durationStr = `${minutes} minutes ${seconds} seconds`;

      return {
        total_duration: durationStr,
        average_response_time: Math.round(avgResponseTime * 10) / 10,
        speaking_pace: speakingPace,
        technical_depth: technicalDepth,
        communication_clarity: communicationClarity,
      };

    } catch (error) {
      console.error('Error calculating analytics:', error);
      return {
        total_duration: 'Unable to calculate',
        average_response_time: 0.0,
        speaking_pace: 'Unknown',
        technical_depth: 'Unknown',
        communication_clarity: 'Unknown',
      };
    }
  }

  private async analyzeConsistency(qaData: InterviewAnswer[]): Promise<number> {
    try {
      if (qaData.length < 2) {
        return 10.0;
      }

      const answersPreview = qaData.map((qa, i) => 
        `Q${i + 1}: ${qa.question_text}... A: ${qa.answer_text.substring(0, 200)}...`
      ).join('\n');

      const prompt = `Analyze the consistency across these interview answers. Look for:
1. Consistent technical knowledge level
2. Consistent communication style
3. Logical flow between related topics
4. No contradictory statements

Answers:
${answersPreview}

Rate the consistency on a scale of 0-10 where:
- 10: Highly consistent, well-aligned responses
- 7-9: Mostly consistent with minor variations
- 4-6: Some inconsistencies but generally coherent
- 1-3: Notable inconsistencies or contradictions
- 0: Major contradictions or incoherent

Respond with just the number (0-10).`;

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      try {
        const score = parseFloat(content.split(' ')[0]); // Get first number
        return Math.max(0, Math.min(10, score));
      } catch {
        return 7.0; // Default consistency score
      }

    } catch (error) {
      console.error('Error analyzing consistency:', error);
      return 7.0;
    }
  }

  private calculateOverallScore(individualScores: number[], analytics: Analytics): number {
    try {
      const baseScore = individualScores.reduce((sum, score) => sum + score, 0) / individualScores.length;

      // Apply modifiers based on analytics
      let modifiers = 0.0;

      // Communication clarity modifier
      if (analytics.communication_clarity === 'Excellent') {
        modifiers += 0.5;
      } else if (analytics.communication_clarity === 'Good') {
        modifiers += 0.2;
      } else if (analytics.communication_clarity === 'Needs Improvement') {
        modifiers -= 0.3;
      }

      // Consistency modifier
      if (analytics.consistency_score !== undefined) {
        if (analytics.consistency_score >= 8) {
          modifiers += 0.3;
        } else if (analytics.consistency_score <= 5) {
          modifiers -= 0.2;
        }
      }

      const finalScore = baseScore + modifiers;
      return Math.max(0, Math.min(10, finalScore));

    } catch (error) {
      console.error('Error calculating overall score:', error);
      return individualScores.length > 0 
        ? individualScores.reduce((sum, score) => sum + score, 0) / individualScores.length 
        : 5.0;
    }
  }

  private async generateOverallFeedback(
    qaData: InterviewAnswer[],
    scores: number[],
    analytics: Analytics,
    role: string
  ): Promise<string> {
    try {
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      const prompt = `Generate overall interview feedback for a ${role} candidate.

Interview Summary:
- Average Score: ${avgScore.toFixed(1)}/10
- Total Duration: ${analytics.total_duration}
- Communication Clarity: ${analytics.communication_clarity}
- Technical Depth: ${analytics.technical_depth}
- Speaking Pace: ${analytics.speaking_pace}

Provide 2-3 sentences of constructive overall feedback that:
1. Acknowledges their strengths
2. Provides encouraging but honest assessment
3. Gives a sense of their readiness for the role

Be professional, constructive, and encouraging.`;

      const response = await this.llm.invoke(prompt);
      return (response.content as string).trim();

    } catch (error) {
      console.error('Error generating overall feedback:', error);
      return 'Thank you for completing the interview. Your responses demonstrated good engagement with the questions and relevant experience for the role.';
    }
  }

  private async generateRecommendations(
    questionAnalyses: QuestionAnalysis[],
    analytics: Analytics,
    role: string
  ): Promise<string[]> {
    try {
      // Collect common improvement areas
      const allImprovements: string[] = [];
      for (const analysis of questionAnalyses) {
        allImprovements.push(...analysis.improvements);
      }

      // Count frequency of improvement areas
      const improvementCounts: Record<string, number> = {};
      for (const improvement of allImprovements) {
        improvementCounts[improvement] = (improvementCounts[improvement] || 0) + 1;
      }

      // Get most common improvements
      const topImprovements = Object.entries(improvementCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      const improvementsList = topImprovements
        .map(([imp, count]) => `- ${imp} (mentioned ${count} times)`)
        .join('\n');

      const prompt = `Generate 3-5 specific, actionable recommendations for a ${role} candidate based on their interview performance.

Key improvement areas mentioned:
${improvementsList}

Analytics:
- Communication Clarity: ${analytics.communication_clarity}
- Technical Depth: ${analytics.technical_depth}
- Speaking Pace: ${analytics.speaking_pace}

Provide specific, actionable recommendations that:
1. Address the most common improvement areas
2. Are relevant to the ${role} role
3. Include concrete steps they can take
4. Are encouraging and constructive

Return as a simple list, one recommendation per line.`;

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;
      
      const recommendations = content
        .split('\n')
        .map(r => r.trim().replace(/^\d+\.\s*/, '').replace(/^-\s*/, ''))
        .filter(r => r.length > 0)
        .slice(0, 5); // Limit to 5 recommendations

      return recommendations;

    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [
        `Continue developing your ${role.toLowerCase()} skills through hands-on projects`,
        'Practice explaining technical concepts clearly and concisely',
        'Review fundamental concepts relevant to your target role'
      ];
    }
  }
}