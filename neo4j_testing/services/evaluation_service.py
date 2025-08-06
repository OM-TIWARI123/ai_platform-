import os
import statistics
from typing import List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from models.response_models import QuestionAnalysis, Analytics

class EvaluationService:
    """Service for evaluating interview responses and generating analytics"""
    
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
    
    async def evaluate_complete_interview(self, session_id: str, qa_pairs: List[Any], role: str) -> Dict[str, Any]:
        """
        Evaluate entire interview holistically
        
        Args:
            session_id: Interview session ID
            qa_pairs: List of question-answer pairs
            role: Interview role
            
        Returns:
            Complete evaluation results
        """
        try:
            print(f"Evaluating interview for session {session_id}, role: {role}")
            
            # Individual question evaluations
            question_analyses = []
            individual_scores = []
            
            for i, qa in enumerate(qa_pairs):
                analysis = await self._evaluate_single_answer(
                    qa.question_text, 
                    qa.answer_text, 
                    role,
                    qa.question_id
                )
                question_analyses.append(analysis)
                individual_scores.append(analysis.score)
            
            # Calculate analytics
            analytics = await self._calculate_analytics(qa_pairs, individual_scores)
            
            # Cross-question analysis
            consistency_score = await self._analyze_consistency(qa_pairs)
            analytics.consistency_score = consistency_score
            
            # Calculate overall score
            overall_score = await self._calculate_overall_score(individual_scores, analytics)
            
            # Generate overall feedback
            overall_feedback = await self._generate_overall_feedback(
                qa_pairs, individual_scores, analytics, role
            )
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(
                question_analyses, analytics, role
            )
            
            return {
                "overall_score": round(overall_score, 1),
                "overall_feedback": overall_feedback,
                "question_analysis": [analysis.dict() for analysis in question_analyses],
                "analytics": analytics.dict(),
                "recommendations": recommendations
            }
            
        except Exception as e:
            print(f"Error evaluating interview: {str(e)}")
            raise Exception(f"Failed to evaluate interview: {str(e)}")
    
    async def _evaluate_single_answer(self, question: str, answer: str, role: str, question_id: int) -> QuestionAnalysis:
        """Evaluate a single question-answer pair"""
        try:
            prompt = f"""You are evaluating a {role} interview answer. Provide a detailed assessment.

Question: {question}
Answer: {answer}

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

If any section has fewer items, just list what applies."""
            
            response = self.llm.invoke(prompt).content.strip()
            
            # Parse response
            score = 5.0  # default
            feedback = "Unable to generate detailed feedback."
            strengths = []
            improvements = []
            
            lines = response.split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('SCORE:'):
                    try:
                        score = float(line.split(':', 1)[1].strip())
                        score = max(0, min(10, score))  # Clamp between 0-10
                    except:
                        pass
                elif line.startswith('FEEDBACK:'):
                    feedback = line.split(':', 1)[1].strip()
                elif line.startswith('STRENGTHS:'):
                    strengths_text = line.split(':', 1)[1].strip()
                    if strengths_text and strengths_text != 'None':
                        strengths = [s.strip() for s in strengths_text.split('|') if s.strip()]
                elif line.startswith('IMPROVEMENTS:'):
                    improvements_text = line.split(':', 1)[1].strip()
                    if improvements_text and improvements_text != 'None':
                        improvements = [i.strip() for i in improvements_text.split('|') if i.strip()]
            
            return QuestionAnalysis(
                question_id=question_id,
                score=score,
                feedback=feedback,
                strengths=strengths,
                improvements=improvements
            )
            
        except Exception as e:
            print(f"Error evaluating single answer: {str(e)}")
            return QuestionAnalysis(
                question_id=question_id,
                score=5.0,
                feedback="Unable to evaluate this response due to a technical issue.",
                strengths=[],
                improvements=["Technical evaluation error occurred"]
            )
    
    async def _calculate_analytics(self, qa_pairs: List[Any], scores: List[float]) -> Analytics:
        """Calculate interview analytics"""
        try:
            total_duration = sum(qa.answer_duration for qa in qa_pairs)
            avg_response_time = statistics.mean(qa.answer_duration for qa in qa_pairs)
            
            # Assess speaking pace
            words_per_answer = []
            for qa in qa_pairs:
                word_count = len(qa.answer_text.split())
                if qa.answer_duration > 0:
                    wpm = (word_count / qa.answer_duration) * 60
                    words_per_answer.append(wpm)
            
            avg_wpm = statistics.mean(words_per_answer) if words_per_answer else 120
            
            if avg_wpm < 100:
                speaking_pace = "Slow"
            elif avg_wpm > 180:
                speaking_pace = "Fast"
            else:
                speaking_pace = "Normal"
            
            # Assess technical depth
            avg_score = statistics.mean(scores)
            if avg_score >= 8:
                technical_depth = "High"
            elif avg_score >= 6:
                technical_depth = "Medium"
            else:
                technical_depth = "Low"
            
            # Assess communication clarity
            total_words = sum(len(qa.answer_text.split()) for qa in qa_pairs)
            avg_words_per_answer = total_words / len(qa_pairs)
            
            if avg_words_per_answer >= 50 and avg_score >= 7:
                communication_clarity = "Excellent"
            elif avg_words_per_answer >= 30 and avg_score >= 6:
                communication_clarity = "Good"
            elif avg_words_per_answer >= 20:
                communication_clarity = "Fair"
            else:
                communication_clarity = "Needs Improvement"
            
            # Format duration
            minutes = int(total_duration // 60)
            seconds = int(total_duration % 60)
            duration_str = f"{minutes} minutes {seconds} seconds"
            
            return Analytics(
                total_duration=duration_str,
                average_response_time=round(avg_response_time, 1),
                speaking_pace=speaking_pace,
                technical_depth=technical_depth,
                communication_clarity=communication_clarity
            )
            
        except Exception as e:
            print(f"Error calculating analytics: {str(e)}")
            return Analytics(
                total_duration="Unable to calculate",
                average_response_time=0.0,
                speaking_pace="Unknown",
                technical_depth="Unknown",
                communication_clarity="Unknown"
            )
    
    async def _analyze_consistency(self, qa_pairs: List[Any]) -> float:
        """Analyze consistency across answers"""
        try:
            if len(qa_pairs) < 2:
                return 10.0
            
            prompt = f"""Analyze the consistency across these interview answers. Look for:
1. Consistent technical knowledge level
2. Consistent communication style
3. Logical flow between related topics
4. No contradictory statements

Answers:
{chr(10).join([f"Q{i+1}: {qa.question_text}... A: {qa.answer_text[:200]}..." for i, qa in enumerate(qa_pairs)])}

Rate the consistency on a scale of 0-10 where:
- 10: Highly consistent, well-aligned responses
- 7-9: Mostly consistent with minor variations
- 4-6: Some inconsistencies but generally coherent
- 1-3: Notable inconsistencies or contradictions
- 0: Major contradictions or incoherent

Respond with just the number (0-10)."""
            
            response = self.llm.invoke(prompt).content.strip()
            
            try:
                score = float(response.split()[0])  # Get first number
                return max(0, min(10, score))
            except:
                return 7.0  # Default consistency score
                
        except Exception as e:
            print(f"Error analyzing consistency: {str(e)}")
            return 7.0
    
    async def _calculate_overall_score(self, individual_scores: List[float], analytics: Analytics) -> float:
        """Calculate weighted overall score"""
        try:
            base_score = statistics.mean(individual_scores)
            
            # Apply modifiers based on analytics
            modifiers = 0.0
            
            # Communication clarity modifier
            if analytics.communication_clarity == "Excellent":
                modifiers += 0.5
            elif analytics.communication_clarity == "Good":
                modifiers += 0.2
            elif analytics.communication_clarity == "Needs Improvement":
                modifiers -= 0.3
            
            # Consistency modifier
            if hasattr(analytics, 'consistency_score') and analytics.consistency_score:
                if analytics.consistency_score >= 8:
                    modifiers += 0.3
                elif analytics.consistency_score <= 5:
                    modifiers -= 0.2
            
            final_score = base_score + modifiers
            return max(0, min(10, final_score))
            
        except Exception as e:
            print(f"Error calculating overall score: {str(e)}")
            return statistics.mean(individual_scores) if individual_scores else 5.0
    
    async def _generate_overall_feedback(self, qa_pairs: List[Any], scores: List[float], analytics: Analytics, role: str) -> str:
        """Generate comprehensive overall feedback"""
        try:
            avg_score = statistics.mean(scores)
            
            prompt = f"""Generate overall interview feedback for a {role} candidate.

Interview Summary:
- Average Score: {avg_score:.1f}/10
- Total Duration: {analytics.total_duration}
- Communication Clarity: {analytics.communication_clarity}
- Technical Depth: {analytics.technical_depth}
- Speaking Pace: {analytics.speaking_pace}

Provide 2-3 sentences of constructive overall feedback that:
1. Acknowledges their strengths
2. Provides encouraging but honest assessment
3. Gives a sense of their readiness for the role

Be professional, constructive, and encouraging."""
            
            response = self.llm.invoke(prompt).content.strip()
            return response
            
        except Exception as e:
            print(f"Error generating overall feedback: {str(e)}")
            return "Thank you for completing the interview. Your responses demonstrated good engagement with the questions and relevant experience for the role."
    
    async def _generate_recommendations(self, question_analyses: List[QuestionAnalysis], analytics: Analytics, role: str) -> List[str]:
        """Generate personalized recommendations"""
        try:
            # Collect common improvement areas
            all_improvements = []
            for analysis in question_analyses:
                all_improvements.extend(analysis.improvements)
            
            # Count frequency of improvement areas
            improvement_counts = {}
            for improvement in all_improvements:
                improvement_counts[improvement] = improvement_counts.get(improvement, 0) + 1
            
            # Get most common improvements
            top_improvements = sorted(improvement_counts.items(), key=lambda x: x[1], reverse=True)[:3]
            
            prompt = f"""Generate 3-5 specific, actionable recommendations for a {role} candidate based on their interview performance.

Key improvement areas mentioned:
{chr(10).join([f"- {imp[0]} (mentioned {imp[1]} times)" for imp in top_improvements])}

Analytics:
- Communication Clarity: {analytics.communication_clarity}
- Technical Depth: {analytics.technical_depth}
- Speaking Pace: {analytics.speaking_pace}

Provide specific, actionable recommendations that:
1. Address the most common improvement areas
2. Are relevant to the {role} role
3. Include concrete steps they can take
4. Are encouraging and constructive

Return as a simple list, one recommendation per line."""
            
            response = self.llm.invoke(prompt).content.strip()
            recommendations = [
                r.strip().lstrip('1234567890.-) ') 
                for r in response.split('\n') 
                if r.strip()
            ]
            
            return recommendations[:5]  # Limit to 5 recommendations
            
        except Exception as e:
            print(f"Error generating recommendations: {str(e)}")
            return [
                f"Continue developing your {role.lower()} skills through hands-on projects",
                "Practice explaining technical concepts clearly and concisely",
                "Review fundamental concepts relevant to your target role"
            ]