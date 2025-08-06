import os
from typing import List
from langchain_google_genai import ChatGoogleGenerativeAI

class TransitionGenerator:
    """Service for generating smooth transition phrases between questions"""
    
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
    
    async def generate_transitions(self, num_questions: int) -> List[str]:
        """
        Generate transition phrases for smooth interview flow
        
        Args:
            num_questions: Number of questions in the interview
            
        Returns:
            List of transition phrases
        """
        try:
            prompt = f"""Generate {num_questions} smooth, natural transition phrases for an AI interview. 
            These phrases will be used between questions to maintain conversational flow.and dont give the candiadate any feedback i your transitions 
            keep it like a normal conversation between a recruiter and a candidate eg: ok lets move on to the next question.not like great answer lets move on to the next question.
            Requirements:
            1. Keep them brief (1-2 sentences)
            2. Sound natural and encouraging
            3. Vary the phrasing to avoid repetition
            4. Maintain professional but friendly tone
            5. Include acknowledgment and smooth segue
            
            Return exactly {num_questions} transitions, one per line."""
            
            response = self.llm.invoke(prompt)
            transitions = [
                t.strip().lstrip('1234567890.-) ') 
                for t in response.content.strip().split('\n') 
                if t.strip()
            ]
            
            # Ensure we have the right number of transitions
            transitions = transitions[:num_questions]
            
            # Fill with default transitions if needed
            default_transitions = [
                "Great! Let's move on to the next question.",
                "Excellent answer. Here's another question for you.",
                "That's insightful. Let's continue with the next topic.",
                "Good explanation. Now let's discuss another aspect.",
                "Perfect! Let's explore another area.",
                "Thank you for that detailed response. Moving forward,",
                "Interesting perspective. Let's shift our focus to",
                "That's very helpful. Now I'd like to ask about"
            ]
            
            while len(transitions) < num_questions:
                transitions.extend(default_transitions)
                break
            
            return transitions[:num_questions]
            
        except Exception as e:
            print(f"Error generating transitions: {str(e)}")
            # Return default transitions as fallback
            default_transitions = [
                "Great! Let's move on to the next question.",
                "Excellent answer. Here's another question for you.",
                "That's insightful. Let's continue with the next topic.",
                "Good explanation. Now let's discuss another aspect.",
                "Perfect! Let's explore another area."
            ]
            return (default_transitions * ((num_questions // len(default_transitions)) + 1))[:num_questions]
    
    async def generate_dynamic_transition(self, context: dict, answer: str, question_num: int, total_questions: int, is_intro: bool = False) -> str:
        """
        Generate a dynamic transition based on the candidate's answer
        
        Args:
            context: Interview context and history
            answer: Candidate's previous answer
            question_num: Current question number
            total_questions: Total number of questions
            is_intro: Whether this is after the introduction
            
        Returns:
            Personalized transition phrase
        """
        try:
            if is_intro:
                prompt = f"""The candidate just introduced themselves with: "{answer}"
                
Generate a brief, warm transition that:
1. Acknowledges something specific from their introduction
2. Transitions smoothly to the technical questions
3. Keeps them comfortable and engaged

Keep it to 1-2 sentences and natural."""
            else:
                progress_info = f"question {question_num} of {total_questions}"
                
                if question_num == total_questions:
                    prompt = f"""This was the final question ({progress_info}). The candidate answered: "{answer}"
                    
Generate a brief closing transition that:
1. Thanks them for their time
2. Indicates the interview is complete
3. Sounds warm and professional

Keep it to 1-2 sentences."""
                else:
                    prompt = f"""We're on {progress_info}. The candidate just answered: "{answer}"
                    
Generate a brief transition that:
1. Briefly acknowledges their answer (without detailed feedback)
2. Smoothly moves to the next question
3. Maintains positive momentum

Keep it to 1-2 sentences and conversational."""
            
            response = self.llm.invoke(prompt)
            return response.content.strip()
            
        except Exception as e:
            print(f"Error generating dynamic transition: {str(e)}")
            
            # Fallback based on context
            if is_intro:
                return "Thank you for that introduction. Now let's dive into some questions about your experience."
            elif question_num == total_questions:
                return "Excellent! That concludes our interview questions. Thank you for your time today."
            else:
                return "Great answer. Let's continue with the next question."