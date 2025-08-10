'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

// Utility function to parse resume content
async function parseResumeFile(file: File): Promise<string> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  switch (fileExtension) {
    case 'txt':
      return await parseTextFile(file);
    case 'pdf':
      // For now, we'll handle PDF as text. You can add PDF parsing library later
      throw new Error('PDF parsing not implemented yet. Please use a .txt file for now.');
    case 'doc':
    case 'docx':
      // For now, we'll handle DOC/DOCX as text. You can add document parsing library later
      throw new Error('DOC/DOCX parsing not implemented yet. Please use a .txt file for now.');
    default:
      throw new Error(`Unsupported file type: ${fileExtension}`);
  }
}

async function parseTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content || content.trim().length === 0) {
        reject(new Error('Resume file appears to be empty'));
        return;
      }
      resolve(content);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export default function Home({ params }: { params: { id: string } }) {
  const userId = params.id;
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
  };

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size too large. Please upload a file smaller than 2MB.');
        return;
      }
      setResumeFile(file);
    }
  };

  const handleStartInterview = async () => {
    if (!selectedRole || !resumeFile || !userId) {
      alert('Please select a role and upload your resume');
      return;
    }

    setIsLoading(true);

    try {
      // Parse resume content on the frontend
      console.log('Parsing resume file...');
      const resumeContent = await parseResumeFile(resumeFile);
      
      if (resumeContent.length < 100) {
        alert('Resume content seems too short. Please ensure your resume contains sufficient information.');
        setIsLoading(false);
        return;
      }

      // Store initialization data temporarily for the interview page
      const initData = {
        role: selectedRole,
        resumeContent: resumeContent,
        userId: userId
      };
      console.log(initData)
      localStorage.setItem('interviewInitData', JSON.stringify(initData));
      
      // Navigate to interview page - the interview page will handle API calls
      router.push(`/interview/${userId}`);
      
    } catch (error) {
      console.error('Error processing resume:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to process resume: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1>AI Interview App</h1>
        <div>
          <h2>Processing...</h2>
          <p>Please wait while we process your resume...</p>
          <div>⏳ Parsing resume content and preparing your interview...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1>AI Interview App</h1>
      <UserButton/>
      <div>
        <h2>Select Your Role</h2>
        <div>
          <button
            onClick={() => handleRoleSelect('SDE')}
            style={{ 
              backgroundColor: selectedRole === 'SDE' ? '#007bff' : '#f8f9fa',
              color: selectedRole === 'SDE' ? 'white' : 'black',
              margin: '5px',
              padding: '10px 20px',
              border: '1px solid #ccc',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Software Development Engineer (SDE)
          </button>
          
          <button
            onClick={() => handleRoleSelect('Data Scientist')}
            style={{ 
              backgroundColor: selectedRole === 'Data Scientist' ? '#007bff' : '#f8f9fa',
              color: selectedRole === 'Data Scientist' ? 'white' : 'black',
              margin: '5px',
              padding: '10px 20px',
              border: '1px solid #ccc',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Data Scientist
          </button>
          
          <button
            onClick={() => handleRoleSelect('Product Manager')}
            style={{ 
              backgroundColor: selectedRole === 'Product Manager' ? '#007bff' : '#f8f9fa',
              color: selectedRole === 'Product Manager' ? 'white' : 'black',
              margin: '5px',
              padding: '10px 20px',
              border: '1px solid #ccc',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Product Manager
          </button>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>Upload Your Resume</h2>
        <input
          type="file"
          accept=".txt,.pdf,.doc,.docx"
          onChange={handleResumeUpload}
          style={{ margin: '10px 0' }}
        />
        {resumeFile && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f8ff', borderRadius: '4px' }}>
            <p><strong>Selected file:</strong> {resumeFile.name}</p>
            <p><strong>Size:</strong> {(resumeFile.size / 1024).toFixed(2)} KB</p>
            <p><strong>Type:</strong> {resumeFile.type || 'Unknown'}</p>
            {!resumeFile.name.toLowerCase().endsWith('.txt') && (
              <p style={{ color: '#ff6600', fontSize: '14px' }}>
                ⚠️ Note: Currently only .txt files are fully supported. PDF/DOC support coming soon.
              </p>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleStartInterview}
          disabled={!selectedRole || !resumeFile || isLoading || !userId}
          style={{
            backgroundColor: (!selectedRole || !resumeFile || isLoading || !userId) ? '#ccc' : '#28a745',
            color: 'white',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '4px',
            cursor: (!selectedRole || !resumeFile || isLoading || !userId) ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {isLoading ? 'Processing Resume...' : 'Start Interview'}
        </button>
      </div>

      {selectedRole && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
          <p><strong>Selected Role:</strong> {selectedRole}</p>
          <p><strong>Next Step:</strong> Upload your resume to begin the interview</p>
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            <p><strong>What happens next:</strong></p>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>Your resume will be analyzed to generate personalized questions</li>
              <li>You'll get 5 role-specific interview questions</li>
              <li>After completion, you'll receive detailed feedback and analytics</li>
            </ul>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>File Format Guidelines:</h3>
        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
          <li><strong>.txt files:</strong> Fully supported ✅</li>
          <li><strong>.pdf files:</strong> Support coming soon 🔄</li>
          <li><strong>.doc/.docx files:</strong> Support coming soon 🔄</li>
        </ul>
        <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
          For best results, copy your resume content into a .txt file for now.
        </p>
      </div>
    </div>
  );
}