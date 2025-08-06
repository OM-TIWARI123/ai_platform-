from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class InitializeRequest(BaseModel):
    """Request model for initializing interview session"""
    role: str = Field(..., description="Role for the interview (SDE, Data Scientist, Product Manager)")

class InterviewAnswer(BaseModel):
    """Model for individual question-answer pair"""
    question_id: int = Field(..., description="ID of the question")
    question_text: str = Field(..., description="Text of the question asked")
    answer_text: str = Field(..., description="Candidate's answer text")
    answer_duration: float = Field(..., description="Duration of answer in seconds")

class SubmitInterviewRequest(BaseModel):
    """Request model for submitting complete interview"""
    session_id: str = Field(..., description="Unique session identifier")
    interview_data: List[InterviewAnswer] = Field(..., description="List of all question-answer pairs")

class EvaluationRequest(BaseModel):
    """Request model for getting evaluation results"""
    evaluation_id: str = Field(..., description="Unique evaluation identifier")