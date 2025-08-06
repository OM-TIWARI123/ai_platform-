import os
import asyncio
import time
import uuid
import json
from pathlib import Path
from typing import List, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv

# Import your existing services (we'll create these)
from models.request_models import InitializeRequest, SubmitInterviewRequest
from models.response_models import (
    InitializeResponse, 
    SubmitInterviewResponse, 
    ResultsResponse,
    QuestionData,
    TransitionData
)
from services.resume_processor import ResumeProcessor
from services.question_generator import QuestionGenerator
from services.transition_generator import TransitionGenerator
from services.evaluation_service import EvaluationService
from storage.session_manager import SessionManager

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="AI Interview Backend",
    description="FastAPI backend for AI-powered interview system",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
resume_processor = ResumeProcessor()
question_generator = QuestionGenerator()
transition_generator = TransitionGenerator()
evaluation_service = EvaluationService()
session_manager = SessionManager()

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.post("/api/interview/initialize", response_model=InitializeResponse)
async def initialize_interview(
    role: str,
    resume: UploadFile = File(...)
):
    print("entering intitalized")
    """
    Initialize interview session with resume upload and question generation
    """
    try:
        # Validate file type
        allowed_extensions = {'.pdf', '.docx', '.txt'}
        file_extension = Path(resume.filename).suffix.lower()
        print("file :",file_extension)
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Validate role
        valid_roles = ["SDE", "Data Scientist", "Product Manager"]
        if role not in valid_roles:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        
        # Generate unique session ID
        session_id = str(uuid.uuid4())
        
        # Save uploaded file
        file_path = UPLOAD_DIR / f"{session_id}_{resume.filename}"
        content = await resume.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Process resume and generate questions
        print(f"Processing resume for session {session_id}")
        
        # Process resume to create vector store
        vector_db = await resume_processor.process_resume(file_path)
        
        # Generate contextual questions
        questions_list = await question_generator.generate_questions(
            vector_db, role, str(file_path)
        )
        
        # Create question objects with IDs
        questions = [
            QuestionData(id=i+1, text=q) 
            for i, q in enumerate(questions_list)
        ]
        
        # Generate intro message
        intro_message = await question_generator.generate_intro_message(role)
        
        # Generate transition phrases
        transitions = await transition_generator.generate_transitions(len(questions))
        
        # Store session data
        session_data = {
            "session_id": session_id,
            "role": role,
            "resume_path": str(file_path),
            "questions": [q.dict() for q in questions],
            "vector_db_collection": vector_db.collection_name if hasattr(vector_db, 'collection_name') else None,
            "created_at": time.time()
        }
        
        await session_manager.store_session(session_id, session_data)
        
        # Clean up file after processing (optional)
        # file_path.unlink()  # Uncomment if you don't want to keep files
        
        return InitializeResponse(
            session_id=session_id,
            intro_message=intro_message,
            questions=questions,
            transitions=[TransitionData(text=t) for t in transitions]
        )
        
    except Exception as e:
        print(f"Error initializing interview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/interview/submit", response_model=SubmitInterviewResponse)
async def submit_interview(
    request: SubmitInterviewRequest,
    background_tasks: BackgroundTasks
):
    """
    Submit complete interview for evaluation
    """
    try:
        # Validate session exists
        session_data = await session_manager.get_session(request.session_id)
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Generate evaluation ID
        evaluation_id = str(uuid.uuid4())
        
        # Store interview data for processing
        interview_data = {
            "evaluation_id": evaluation_id,
            "session_id": request.session_id,
            "role": session_data["role"],
            "interview_data": [qa.dict() for qa in request.interview_data],
            "submitted_at": time.time(),
            "status": "processing"
        }
        
        await session_manager.store_evaluation(evaluation_id, interview_data)
        
        # Process evaluation in background
        background_tasks.add_task(
            process_evaluation_background,
            evaluation_id,
            session_data,
            request.interview_data
        )
        
        return SubmitInterviewResponse(
            evaluation_id=evaluation_id,
            message="Interview submitted successfully. Processing results..."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error submitting interview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/interview/results/{evaluation_id}", response_model=ResultsResponse)
async def get_results(evaluation_id: str):
    """
    Get evaluation results and analytics
    """
    try:
        # Get evaluation data
        evaluation_data = await session_manager.get_evaluation(evaluation_id)
        if not evaluation_data:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        # Check if processing is complete
        if evaluation_data.get("status") == "processing":
            return JSONResponse(
                status_code=202,
                content={"message": "Results are still being processed. Please try again in a moment."}
            )
        
        if evaluation_data.get("status") == "error":
            raise HTTPException(status_code=500, detail="Error processing evaluation")
        
        # Return results
        results = evaluation_data.get("results")
        if not results:
            raise HTTPException(status_code=500, detail="Results not available")
        
        return ResultsResponse(**results)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

async def process_evaluation_background(
    evaluation_id: str,
    session_data: Dict[str, Any],
    interview_data: List[Any]
):
    """
    Background task to process evaluation
    """
    try:
        print(f"Processing evaluation {evaluation_id}")
        
        # Run evaluation
        results = await evaluation_service.evaluate_complete_interview(
            session_data["session_id"],
            interview_data,
            session_data["role"]
        )
        
        # Update evaluation with results
        await session_manager.update_evaluation(evaluation_id, {
            "status": "completed",
            "results": results,
            "completed_at": time.time()
        })
        
        print(f"Evaluation {evaluation_id} completed successfully")
        
    except Exception as e:
        print(f"Error processing evaluation {evaluation_id}: {str(e)}")
        await session_manager.update_evaluation(evaluation_id, {
            "status": "error",
            "error": str(e),
            "completed_at": time.time()
        })

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": time.time()}

@app.get("/api/sessions/{session_id}")
async def get_session_info(session_id: str):
    """Get session information (for debugging)"""
    session_data = await session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Remove sensitive data
    safe_data = {
        "session_id": session_data["session_id"],
        "role": session_data["role"],
        "questions_count": len(session_data["questions"]),
        "created_at": session_data["created_at"]
    }
    return safe_data

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )


    