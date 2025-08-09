import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Question, Transition } from '@/lib/types/interview';
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

interface GeneratedInterview {
    questions: Question[];
    transitions: Transition[];
    intro_message: string;
}

const rolePrompts = {
    'SDE': 'Technical software development questions focusing on algorithms, system design, and coding practices',
    'Data Scientist': 'Data science questions focusing on statistics, machine learning, and data analysis',
    'Product Manager': 'Product management questions focusing on strategy, execution, and leadership'
};

export async function generateQuestions(role: string, resumeText: string): Promise<GeneratedInterview> {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Given this resume: "${resumeText}"
        
        Generate a technical interview for a ${role} position. The response should be in JSON format with the following structure:
        {
            "questions": [
                {
                    "id": "string (UUID)",
                    "text": "string (the actual question)",
                    "category": "string (technical/behavioral/experience)",
                    "difficulty": number (1-5),
                    "context": "string (optional, based on resume content)"
                }
            ],
            "transitions": [
                {
                    "from_question": "UUID of the previous question",
                    "to_question": "UUID of the next question",
                    "text": "Natural transition text between questions"
                }
            ],
            "intro_message": "string (personalized interview introduction)"
        }
        
        Generate 5-7 questions that:
        1. Are relevant to the role and candidate's experience
        2. Progress from easier to more challenging
        3. Include a mix of technical and behavioral questions
        4. Reference specific points from the resume when appropriate
        
        Make transitions natural and professional.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const parsedData = JSON.parse(text);

        // Ensure each question has a valid UUID
        const questions: Question[] = parsedData.questions.map((q: any) => ({
            id: q.id || uuidv4(),
            text: q.text,
            category: q.category.toLowerCase(),
            difficulty: Number(q.difficulty),
            context: q.context
        }));

        // Ensure transitions reference valid question IDs
        const transitions: Transition[] = parsedData.transitions.map((t: any) => ({
            from_question: t.from_question,
            to_question: t.to_question,
            text: t.text
        }));

        return {
            questions,
            transitions,
            intro_message: parsedData.intro_message
        };
    } catch (error) {
        console.error('Error generating questions:', error);
        throw new Error('Failed to generate interview questions');
    }
}
