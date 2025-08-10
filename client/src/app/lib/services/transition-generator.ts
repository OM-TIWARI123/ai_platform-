// src/lib/services/transition-generator.ts
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export class TransitionGenerator {
  private llm: ChatGoogleGenerativeAI;

  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-flash',
      apiKey: process.env.GOOGLE_API_KEY!,
    });
  }

  async generateTransitions(numQuestions: number): Promise<string[]> {
    try {
      const prompt = `Generate ${numQuestions} smooth, natural transition phrases for an AI interview. 
      These phrases will be used between questions to maintain conversational flow and don't give the candidate any feedback in your transitions 
      keep it like a normal conversation between a recruiter and a candidate eg: ok lets move on to the next question. not like great answer lets move on to the next question.
      
      Requirements:
      1. Keep them brief (1-2 sentences)
      2. Sound natural and encouraging
      3. Vary the phrasing to avoid repetition
      4. Maintain professional but friendly tone
      5. Include acknowledgment and smooth segue
      
      Return exactly ${numQuestions} transitions, one per line.`;

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;
      
      const transitions = content
        .split('\n')
        .map(t => t.trim().replace(/^\d+\.\s*/, ''))
        .filter(t => t.length > 0)
        .slice(0, numQuestions);

      // Fill with default transitions if needed
      const defaultTransitions = [
        "Great! Let's move on to the next question.",
        "Excellent answer. Here's another question for you.",
        "That's insightful. Let's continue with the next topic.",
        "Good explanation. Now let's discuss another aspect.",
        "Perfect! Let's explore another area.",
        "Thank you for that detailed response. Moving forward,",
        "Interesting perspective. Let's shift our focus to",
        "That's very helpful. Now I'd like to ask about"
      ];

      while (transitions.length < numQuestions) {
        transitions.push(...defaultTransitions.slice(0, numQuestions - transitions.length));
      }

      return transitions.slice(0, numQuestions);

    } catch (error) {
      console.error('Error generating transitions:', error);
      // Return default transitions as fallback
      const defaultTransitions = [
        "Great! Let's move on to the next question.",
        "Excellent answer. Here's another question for you.",
        "That's insightful. Let's continue with the next topic.",
        "Good explanation. Now let's discuss another aspect.",
        "Perfect! Let's explore another area."
      ];
      return Array.from({ length: numQuestions }, (_, i) => 
        defaultTransitions[i % defaultTransitions.length]
      );
    }
  }
}