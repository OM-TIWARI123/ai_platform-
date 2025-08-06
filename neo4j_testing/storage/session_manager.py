import json
import os
import time
from pathlib import Path
from typing import Dict, Any, Optional

class SessionManager:
    """Manages interview sessions and evaluation data"""
    
    def __init__(self):
        # Create storage directories
        self.storage_dir = Path("storage")
        self.sessions_dir = self.storage_dir / "sessions"
        self.evaluations_dir = self.storage_dir / "evaluations"
        
        self.storage_dir.mkdir(exist_ok=True)
        self.sessions_dir.mkdir(exist_ok=True)
        self.evaluations_dir.mkdir(exist_ok=True)
    
    async def store_session(self, session_id: str, session_data: Dict[str, Any]) -> bool:
        """
        Store session data
        
        Args:
            session_id: Unique session identifier
            session_data: Session data to store
            
        Returns:
            True if successful, False otherwise
        """
        try:
            session_file = self.sessions_dir / f"{session_id}.json"
            
            with open(session_file, 'w', encoding='utf-8') as f:
                json.dump(session_data, f, indent=2, ensure_ascii=False)
            
            print(f"Stored session data for {session_id}")
            return True
            
        except Exception as e:
            print(f"Error storing session {session_id}: {str(e)}")
            return False
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve session data
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            Session data dictionary or None if not found
        """
        try:
            session_file = self.sessions_dir / f"{session_id}.json"
            
            if not session_file.exists():
                print(f"Session {session_id} not found")
                return None
            
            with open(session_file, 'r', encoding='utf-8') as f:
                session_data = json.load(f)
            
            return session_data
            
        except Exception as e:
            print(f"Error retrieving session {session_id}: {str(e)}")
            return None
    
    async def store_evaluation(self, evaluation_id: str, evaluation_data: Dict[str, Any]) -> bool:
        """
        Store evaluation data
        
        Args:
            evaluation_id: Unique evaluation identifier
            evaluation_data: Evaluation data to store
            
        Returns:
            True if successful, False otherwise
        """
        try:
            evaluation_file = self.evaluations_dir / f"{evaluation_id}.json"
            
            with open(evaluation_file, 'w', encoding='utf-8') as f:
                json.dump(evaluation_data, f, indent=2, ensure_ascii=False)
            
            print(f"Stored evaluation data for {evaluation_id}")
            return True
            
        except Exception as e:
            print(f"Error storing evaluation {evaluation_id}: {str(e)}")
            return False
    
    async def get_evaluation(self, evaluation_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve evaluation data
        
        Args:
            evaluation_id: Unique evaluation identifier
            
        Returns:
            Evaluation data dictionary or None if not found
        """
        try:
            evaluation_file = self.evaluations_dir / f"{evaluation_id}.json"
            
            if not evaluation_file.exists():
                print(f"Evaluation {evaluation_id} not found")
                return None
            
            with open(evaluation_file, 'r', encoding='utf-8') as f:
                evaluation_data = json.load(f)
            
            return evaluation_data
            
        except Exception as e:
            print(f"Error retrieving evaluation {evaluation_id}: {str(e)}")
            return None
    
    async def update_evaluation(self, evaluation_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update evaluation data
        
        Args:
            evaluation_id: Unique evaluation identifier
            updates: Dictionary of updates to apply
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get existing evaluation data
            evaluation_data = await self.get_evaluation(evaluation_id)
            
            if not evaluation_data:
                print(f"Evaluation {evaluation_id} not found for update")
                return False
            
            # Apply updates
            evaluation_data.update(updates)
            
            # Store updated data
            return await self.store_evaluation(evaluation_id, evaluation_data)
            
        except Exception as e:
            print(f"Error updating evaluation {evaluation_id}: {str(e)}")
            return False
    
    async def delete_session(self, session_id: str) -> bool:
        """
        Delete session data
        
        Args:
            session_id: Unique session identifier
            
        Returns:
            True if successful, False otherwise
        """
        try:
            session_file = self.sessions_dir / f"{session_id}.json"
            
            if session_file.exists():
                session_file.unlink()
                print(f"Deleted session {session_id}")
                return True
            else:
                print(f"Session {session_id} not found for deletion")
                return False
                
        except Exception as e:
            print(f"Error deleting session {session_id}: {str(e)}")
            return False
    
    async def delete_evaluation(self, evaluation_id: str) -> bool:
        """
        Delete evaluation data
        
        Args:
            evaluation_id: Unique evaluation identifier
            
        Returns:
            True if successful, False otherwise
        """
        try:
            evaluation_file = self.evaluations_dir / f"{evaluation_id}.json"
            
            if evaluation_file.exists():
                evaluation_file.unlink()
                print(f"Deleted evaluation {evaluation_id}")
                return True
            else:
                print(f"Evaluation {evaluation_id} not found for deletion")
                return False
                
        except Exception as e:
            print(f"Error deleting evaluation {evaluation_id}: {str(e)}")
            return False
    
    async def cleanup_old_sessions(self, max_age_hours: int = 24) -> int:
        """
        Clean up old session files
        
        Args:
            max_age_hours: Maximum age in hours before cleanup
            
        Returns:
            Number of files cleaned up
        """
        try:
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            cleaned_count = 0
            
            # Clean up sessions
            for session_file in self.sessions_dir.glob("*.json"):
                file_age = current_time - session_file.stat().st_mtime
                if file_age > max_age_seconds:
                    session_file.unlink()
                    cleaned_count += 1
            
            # Clean up evaluations
            for evaluation_file in self.evaluations_dir.glob("*.json"):
                file_age = current_time - evaluation_file.stat().st_mtime
                if file_age > max_age_seconds:
                    evaluation_file.unlink()
                    cleaned_count += 1
            
            if cleaned_count > 0:
                print(f"Cleaned up {cleaned_count} old files")
            
            return cleaned_count
            
        except Exception as e:
            print(f"Error during cleanup: {str(e)}")
            return 0
    
    async def get_session_stats(self) -> Dict[str, Any]:
        """
        Get statistics about stored data
        
        Returns:
            Dictionary with storage statistics
        """
        try:
            session_count = len(list(self.sessions_dir.glob("*.json")))
            evaluation_count = len(list(self.evaluations_dir.glob("*.json")))
            
            # Calculate storage size
            total_size = 0
            for file_path in self.storage_dir.rglob("*.json"):
                total_size += file_path.stat().st_size
            
            # Convert to MB
            size_mb = total_size / (1024 * 1024)
            
            return {
                "sessions_count": session_count,
                "evaluations_count": evaluation_count,
                "total_size_mb": round(size_mb, 2),
                "storage_directory": str(self.storage_dir.absolute())
            }
            
        except Exception as e:
            print(f"Error getting storage stats: {str(e)}")
            return {
                "sessions_count": 0,
                "evaluations_count": 0,
                "total_size_mb": 0.0,
                "error": str(e)
            }