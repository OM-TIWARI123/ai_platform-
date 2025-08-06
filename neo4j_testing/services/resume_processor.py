import os
import time
import pathlib
from typing import Optional
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
import chromadb

class ResumeProcessor:
    """Service for processing resumes and creating vector stores"""
    
    def __init__(self):
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=os.getenv("GOOGLE_API_KEY")
        )
        # Connect to ChromaDB running in Docker
        self.chroma_client = chromadb.HttpClient(host="localhost", port=8000)
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, 
            chunk_overlap=50
        )
    
    def load_text(self, path: str) -> str:
        """Load text from various file formats"""
        file_path = pathlib.Path(path)
        suffix = file_path.suffix.lower()
        
        try:
            if suffix == ".pdf":
                from langchain_community.document_loaders import PyPDFLoader
                loader = PyPDFLoader(str(path))
                documents = loader.load()
                return "\n".join(doc.page_content for doc in documents)
            
            elif suffix == ".docx":
                from langchain_community.document_loaders import Docx2txtLoader
                loader = Docx2txtLoader(str(path))
                documents = loader.load()
                return "\n".join(doc.page_content for doc in documents)
            
            elif suffix == ".txt":
                return file_path.read_text(encoding="utf-8")
            
            else:
                raise ValueError(f"Unsupported file format: {suffix}")
                
        except Exception as e:
            raise Exception(f"Error loading file {path}: {str(e)}")
    
    async def process_resume(self, resume_path: str) -> Chroma:
        """
        Process resume file and create vector store
        
        Args:
            resume_path: Path to the resume file
            
        Returns:
            Chroma vector store instance
        """
        try:
            print(f"Processing resume: {resume_path}")
            
            # Load and extract text
            text = self.load_text(resume_path)
            
            if not text.strip():
                raise ValueError("Resume file appears to be empty or could not be processed")
            
            print(f"Extracted {len(text)} characters from resume")
            
            # Split text into chunks
            chunks = self.text_splitter.split_text(text)
            
            if not chunks:
                raise ValueError("No text chunks could be created from resume")
            
            print(f"Created {len(chunks)} text chunks")
            
            # Create unique collection name
            collection_name = f"resume_{int(time.time())}"
            
            # Create vector store
            vectorstore = Chroma(
                client=self.chroma_client,
                collection_name=collection_name,
                embedding_function=self.embeddings
            )
            
            # Add text chunks to vector store
            vectorstore.add_texts(chunks)
            
            print(f"Created vector store with collection: {collection_name}")
            
            # Store collection name for later reference
            vectorstore.collection_name = collection_name
            
            return vectorstore
            
        except Exception as e:
            print(f"Error processing resume: {str(e)}")
            raise Exception(f"Failed to process resume: {str(e)}")
    
    def get_vectorstore(self, collection_name: str) -> Optional[Chroma]:
        """
        Retrieve existing vector store by collection name
        
        Args:
            collection_name: Name of the ChromaDB collection
            
        Returns:
            Chroma vector store instance or None if not found
        """
        try:
            vectorstore = Chroma(
                client=self.chroma_client,
                collection_name=collection_name,
                embedding_function=self.embeddings
            )
            return vectorstore
        except Exception as e:
            print(f"Error retrieving vector store {collection_name}: {str(e)}")
            return None
    
    def cleanup_collection(self, collection_name: str) -> bool:
        """
        Clean up ChromaDB collection
        
        Args:
            collection_name: Name of the collection to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.chroma_client.delete_collection(collection_name)
            print(f"Deleted collection: {collection_name}")
            return True
        except Exception as e:
            print(f"Error deleting collection {collection_name}: {str(e)}")
            return False