'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { createResume } from '../../actions/resume';

export default  function Home({ params }: { params: { id: string } }) {
  const userId = params.id; // Get user ID from URL params
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

      // For the interview API, you might still want to send the file
      const formData = new FormData();
      formData.append('resume', resumeFile);

      const response = await fetch(`http://127.0.0.1:8000/api/interview/initialize?role=${encodeURIComponent(selectedRole)}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to initialize interview');
      }

      const data = await response.json();
      
      // Store interview data in sessionStorage for the interview page
      sessionStorage.setItem('interviewData', JSON.stringify({
        ...data,// Include the resume ID from database
      }));
      
      // Navigate to interview page
      router.push('/interview');
      
    } catch (error) {
      console.error('Error initializing interview:', error);
      alert('Failed to start interview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1>AI Interview App</h1>
        <div>
          <h2>Loading...</h2>
          <p>Please wait while we prepare your interview questions...</p>
          <div>⏳ Processing your resume and generating personalized questions...</div>
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
              cursor: 'pointer'
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
              cursor: 'pointer'
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
              cursor: 'pointer'
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
          accept=".pdf,.doc,.docx"
          onChange={handleResumeUpload}
          style={{ margin: '10px 0' }}
        />
        {resumeFile && (
          <div>
            <p>Selected file: {resumeFile.name}</p>
            <p>Size: {(resumeFile.size / 1024).toFixed(2)} KB</p>
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
            cursor: (!selectedRole || !resumeFile || isLoading || !userId) ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {isLoading ? 'Starting Interview...' : 'Start Interview'}
        </button>
      </div>

      {selectedRole && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa' }}>
          <p><strong>Selected Role:</strong> {selectedRole}</p>
          <p><strong>Next Step:</strong> Upload your resume to begin the interview</p>
        </div>
      )}
    </div>
  );
}