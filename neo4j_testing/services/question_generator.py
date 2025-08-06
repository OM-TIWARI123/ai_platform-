import os
from typing import List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import PromptTemplate
from pydantic import BaseModel, Field

class InterviewQuestions(BaseModel):
    questions: List[str] = Field(description="List of 5 interview questions")

class QuestionGenerator:
    """Service for generating contextual interview questions"""
    
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
        
        # Role-specific search queries for better context retrieval
        self.role_queries = {
            "SDE": [
                "programming languages projects software development",
                "technical skills algorithms data structures",
                "system design architecture frameworks"
            ],
            "Data Scientist": [
                "data analysis machine learning models",
                "statistics python R SQL databases",
                "visualization analytics business insights"
            ],
            "Product Manager": [
                "product management stakeholder business",
                "project management leadership team",
                "metrics KPIs user research strategy"
            ]
        }
    
    async def generate_questions(self, vector_db, role: str, resume_path: str) -> List[str]:
        """
        Generate contextual interview questions based on role and resume content
        
        Args:
            vector_db: ChromaDB vector store containing resume chunks
            role: Interview role (SDE, Data Scientist, Product Manager)
            resume_path: Path to resume file (for logging)
            
        Returns:
            List of 5 interview questions
        """
        try:
            print(f"Generating questions for role: {role}")
            
            # Get role-specific queries
            queries = self.role_queries.get(role, ["experience skills projects"])
            relevant_chunks = []
            
            # Retrieve relevant chunks from resume
            for query in queries:
                try:
                    docs = vector_db.similarity_search(query, k=2)
                    relevant_chunks.extend([doc.page_content for doc in docs])
                except Exception as e:
                    print(f"Warning: Error retrieving chunks for query '{query}': {str(e)}")
                    continue
            
            # Remove duplicates while preserving order
            seen = set()
            unique_chunks = []
            for chunk in relevant_chunks:
                if chunk not in seen:
                    seen.add(chunk)
                    unique_chunks.append(chunk)
            
            # Combine relevant chunks
            retrieved_context = "\n\n".join(unique_chunks[:5])
            
            if not retrieved_context.strip():
                print("Warning: No relevant context retrieved, using fallback approach")
                return await self._generate_fallback_questions(role)
            
            # Setup output parser
            parser = PydanticOutputParser(pydantic_object=InterviewQuestions)
            
            # Create prompt template
            prompt_template = PromptTemplate(
                template="""Based on the candidate's resume content and the role of {role}, generate exactly 5 specific interview questions.

Retrieved relevant resume content:
{retrieved_context}

Role: {role}

Generate 5 specific questions that:
1. Reference specific points from their resume content
2. Are highly relevant to the {role} role
3. Allow the candidate to elaborate on their experience
4. Help assess their skills and expertise for this specific role
5. Are personalized based on their background

{format_instructions}

Important: Generate exactly 5 questions in the specified format.""",
                input_variables=["role", "retrieved_context"],
                partial_variables={"format_instructions": parser.get_format_instructions()}
            )
            
            # Create the chain
            chain = prompt_template | self.llm | parser
            
            # Generate questions
            result = chain.invoke({
                "role": role,
                "retrieved_context": retrieved_context
            })
            
            print(f"Generated {len(result.questions)} questions successfully")
            return result.questions
            
        except Exception as e:
            print(f"Error in structured generation: {str(e)}")
            print("Falling back to manual parsing")
            return await self._generate_fallback_questions(role, retrieved_context)
    
    async def _generate_fallback_questions(self, role: str, context: str = "") -> List[str]:
        """
        Fallback method for question generation when structured parsing fails
        """
        try:
            fallback_prompt = f"""Based on the candidate's resume and the role of {role}, generate exactly 5 specific interview questions.

Role: {role}

{f"Resume content: {context}" if context else ""}

Generate 5 questions that are relevant to the {role} role and allow assessment of the candidate's skills and experience. 
Return only the questions, one per line, numbered 1-5."""
            
            response = self.llm.invoke(fallback_prompt).content.strip()
            questions = [
                q.strip().lstrip('1234567890.-) ') 
                for q in response.split('\n') 
                if q.strip()
            ]
            
            # Ensure we have exactly 5 questions
            questions = questions[:5]
            
            # If we don't have 5 questions, add generic ones
            while len(questions) < 5:
                generic_questions = self._get_generic_questions(role)
                questions.extend(generic_questions[len(questions):])
                break
            
            return questions[:5]
            
        except Exception as e:
            print(f"Fallback generation also failed: {str(e)}")
            return self._get_generic_questions(role)
    
    def _get_generic_questions(self, role: str) -> List[str]:
        """Get generic questions as a last resort"""
        generic_questions = {
            "SDE": [
                "Tell me about a challenging software development project you've worked on.",
                "How do you approach debugging complex technical issues?",
                "Describe your experience with software design patterns and architecture.",
                "How do you ensure code quality and maintainability in your projects?",
                "What's your approach to learning new technologies and frameworks?"
            ],
            "Data Scientist": [
                "Describe a data science project where you had to work with messy or incomplete data.",
                "How do you approach feature selection and engineering in your models?",
                "Tell me about a time when you had to explain complex analytical findings to non-technical stakeholders.",
                "What's your process for evaluating and validating machine learning models?",
                "How do you stay current with new developments in data science and machine learning?"
            ],
            "Product Manager": [
                "Describe how you prioritize features when building a product roadmap.",
                "Tell me about a time when you had to make a difficult product decision with limited data.",
                "How do you gather and incorporate user feedback into product development?",
                "Describe your approach to working with cross-functional teams.",
                "How do you measure product success and define key performance indicators?"
            ]
        }
        
        return generic_questions.get(role, [
            "Tell me about your professional background.",
            "What interests you about this role?",
            "Describe a challenging project you've worked on.",
            "How do you handle difficult situations at work?",
            "What are your career goals?"
        ])
    
    async def generate_intro_message(self, role: str) -> str:
        """
        Generate a welcoming introduction message for the interview
        
        Args:
            role: Interview role
            
        Returns:
            Introduction message string
        """
        try:
            prompt = f"""You are an AI interviewer conducting a {role} interview. 
            Generate a warm, professional greeting that:
            1. Welcomes the candidate
            2. Briefly explains what will happen in the interview
            3. Encourages them to relax and be themselves
            4. Asks them to introduce themselves
            
            Keep it conversational and friendly, around 2-3 sentences."""
            
            response = self.llm.invoke(prompt)
            return response.content.strip()
            
        except Exception as e:
            print(f"Error generating intro message: {str(e)}")
            return f"Welcome to your {role} interview! I'm excited to learn more about your background and experience. Please start by introducing yourself and telling me a bit about your professional journey."