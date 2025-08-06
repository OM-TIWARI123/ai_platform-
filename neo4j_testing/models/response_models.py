from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class QuestionData(BaseModel):
    """Model for individual question"""
    id: int = Field(..., description="Question ID")
    text: str = Field(..., description="Question text")

class TransitionData(BaseModel):
    """Model for transition phrases"""
    text: str = Field(..., description="Transition phrase text")

class InitializeResponse(BaseModel):
    """Response model for interview initialization"""
    session_id: str = Field(..., description="Unique session identifier")
    intro_message: str = Field(..., description="Welcome message for the interview")
    questions: List[QuestionData] = Field(..., description="List of interview questions")
    transitions: List[TransitionData] = Field(..., description="Transition phrases for smooth flow")

class SubmitInterviewResponse(BaseModel):
    """Response model for interview submission"""
    evaluation_id: str = Field(..., description="Unique evaluation identifier")
    message: str = Field(..., description="Confirmation message")

class QuestionAnalysis(BaseModel):
    """Analysis for individual question"""
    question_id: int = Field(..., description="Question ID")
    score: float = Field(..., description="Score for this question (0-10)")
    feedback: str = Field(..., description="Detailed feedback for the answer")
    strengths: List[str] = Field(default=[], description="Identified strengths")
    improvements: List[str] = Field(default=[], description="Areas for improvement")

class Analytics(BaseModel):
    """Interview analytics data"""
    total_duration: str = Field(..., description="Total interview duration")
    average_response_time: float = Field(..., description="Average response time in seconds")
    speaking_pace: str = Field(..., description="Speaking pace assessment")
    technical_depth: str = Field(..., description="Technical depth assessment")
    communication_clarity: str = Field(..., description="Communication clarity assessment")
    consistency_score: Optional[float] = Field(None, description="Consistency across answers")

class ResultsResponse(BaseModel):
    """Response model for evaluation results"""
    overall_score: float = Field(..., description="Overall interview score (0-10)")
    overall_feedback: str = Field(..., description="Overall feedback summary")
    question_analysis: List[QuestionAnalysis] = Field(..., description="Analysis for each question")
    analytics: Analytics = Field(..., description="Interview analytics")
    recommendations: List[str] = Field(..., description="Recommendations for improvement")

class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Additional error details")

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    timestamp: float = Field(..., description="Current timestamp")