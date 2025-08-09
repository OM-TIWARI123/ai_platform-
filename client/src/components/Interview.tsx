'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface InterviewAnswer {
  question_id: number;
  question_text: string;
  answer_text: string;
  answer_duration: number;
}

interface QuestionData {
  id: number;
  text: string;
}

interface TransitionObject {
  text: string;
}

interface InitializeResponse {
  session_id: string;
  intro_message: string;
  questions: QuestionData[];
  transitions: (string | TransitionObject)[];
}

interface InterviewProps {
  interviewData: InitializeResponse;
  onComplete: (qaData: InterviewAnswer[]) => void;
  onBack: () => void;
}

// TTS Hook
const useTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.log('Invalid text passed to speak:', text);
      return;
    }

    setIsPlaying(true);
    try {
      const textToSpeak = text.trim();
      
      console.log('Speaking text (length:', textToSpeak.length, '):', textToSpeak.substring(0, 100) + '...');
      
      const res = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.log('TTS API Error:', errorData);
        throw new Error(`TTS failed: ${errorData.error || res.statusText}`);
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      return new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setIsPlaying(false);
          resolve();
        };
        audio.onerror = (error) => {
          console.log('Audio playback error:', error);
          URL.revokeObjectURL(audioUrl);
          setIsPlaying(false);
          resolve();
        };
        audio.play();
      });
    } catch (error) {
      console.log('TTS error:', error);
      setIsPlaying(false);
      throw error;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return { speak, isPlaying, stopSpeaking };
};

type InterviewStep = 
  | 'intro-playing'
  | 'intro-recording' 
  | 'transition-playing'
  | 'question-playing'
  | 'question-recording'
  | 'completed'
  | 'submitting';

export default function Interview({ interviewData, onComplete, onBack }: InterviewProps) {
  const [currentStep, setCurrentStep] = useState<InterviewStep>('intro-playing');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [interviewAnswers, setInterviewAnswers] = useState<InterviewAnswer[]>([]);
  const [hasIntroPlayed, setHasIntroPlayed] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const { speak, isPlaying, stopSpeaking } = useTTS();
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Reference to track if we should restart speech recognition
  const shouldRestartRecognition = useRef(false);
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  if (!browserSupportsSpeechRecognition) {
    return <div>Browser doesn't support speech recognition.</div>;
  }

  // Start the interview by playing intro
  useEffect(() => {
    if (!hasIntroPlayed && currentStep === 'intro-playing' && !isPlaying) {
      playIntro();
    }
  }, [hasIntroPlayed, currentStep, isPlaying]);

  // Handle recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording && recordingStartTime !== null) {
      interval = setInterval(() => {
        setRecordingDuration((Date.now() - recordingStartTime) / 1000);
      }, 200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, recordingStartTime]);

  // Monitor speech recognition and restart if needed
  useEffect(() => {
    if (shouldRestartRecognition.current && !listening && isRecording) {
      // Clear any existing timeout
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
      
      // Restart speech recognition after a short delay
      recognitionTimeoutRef.current = setTimeout(() => {
        console.log('Restarting speech recognition...');
        try {
          SpeechRecognition.startListening({ 
            continuous: true, 
            language: 'en-US',
            interimResults: true 
          });
        } catch (error) {
          console.error('Error restarting speech recognition:', error);
        }
      }, 100);
    }

    return () => {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
    };
  }, [listening, isRecording]);

  // Handle speech recognition events
  useEffect(() => {
    const handleSpeechEnd = () => {
      if (shouldRestartRecognition.current && isRecording) {
        console.log('Speech recognition ended, will restart...');
      }
    };

    const handleSpeechError = (event: any) => {
      console.log('Speech recognition error:', event);
      if (shouldRestartRecognition.current && isRecording) {
        console.log('Speech recognition error, will restart...');
      }
    };

    // Add event handlers if SpeechRecognition is available
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      if (recognition) {
        recognition.onend = handleSpeechEnd;
        recognition.onerror = handleSpeechError;
        
        return () => {
          recognition.onend = null;
          recognition.onerror = null;
        };
      }
    }
  }, [isRecording]);

  const playIntro = async () => {
    if (hasIntroPlayed || isPlaying) {
      console.log('Intro already played or currently playing, skipping');
      return;
    }
    
    try {
      console.log('Playing intro message...');
      await speak(interviewData.intro_message);
      setHasIntroPlayed(true);
      setCurrentStep('intro-recording');
      console.log('Intro completed, ready for recording');
    } catch (error) {
      console.error('Error playing intro:', error);
    }
  };

  const handleStartRecording = () => {
    console.log('Starting recording...');
    resetTranscript();
    setRecordingDuration(0);
    setRecordingStartTime(Date.now());
    setIsRecording(true);
    shouldRestartRecognition.current = true;
    
    try {
      SpeechRecognition.startListening({ 
        continuous: true, 
        language: 'en-US',
        interimResults: true 
      });
      console.log('Speech recognition started');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  };

  const handleStopRecording = () => {
    console.log('Stopping recording...');
    setIsRecording(false);
    shouldRestartRecognition.current = false;
    setRecordingStartTime(null);
    
    // Clear any pending restart timeout
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
    
    try {
      SpeechRecognition.stopListening();
      console.log('Speech recognition stopped');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  };

  const handleSubmitResponse = async () => {
    if (!transcript.trim()) {
      alert('Please provide a response before continuing.');
      return;
    }

    // Ensure recording is stopped
    if (isRecording) {
      handleStopRecording();
    }

    if (currentStep === 'intro-recording') {
      // Store intro response
      const introResponse: InterviewAnswer = {
        question_id: 0,
        question_text: "Introduction",
        answer_text: transcript,
        answer_duration: recordingDuration
      };
      
      setInterviewAnswers([introResponse]);
      
      // Move to first transition
      setCurrentQuestionIndex(0);
      setCurrentStep('transition-playing');
      
      // Play transition
      try {
        const transition = interviewData.transitions && interviewData.transitions[0];
        console.log('Raw transition value for index 0:', transition);
        if (transition && typeof transition === 'object' && transition.text) {
          console.log('Transition is object, using .text:', transition.text);
          await speak(transition.text);
        } else if (typeof transition === 'string' && transition.trim().length > 0) {
          console.log('Transition is string:', transition);
          await speak(transition);
        } else {
          console.warn('No valid transition found for index 0:', transition);
        }
        setCurrentStep('question-playing');
        // Play first question
        console.log('About to speak question:', interviewData.questions[0].text);
        await speak(interviewData.questions[0].text);
        setCurrentStep('question-recording');
      } catch (error) {
        console.error('Error in transition/question:', error);
      }
      
    } else if (currentStep === 'question-recording') {
      // Store question response
      const currentQuestion = interviewData.questions[currentQuestionIndex];
      const questionResponse: InterviewAnswer = {
        question_id: currentQuestion.id,
        question_text: currentQuestion.text,
        answer_text: transcript,
        answer_duration: recordingDuration
      };
      
      const updatedAnswers = [...interviewAnswers, questionResponse];
      setInterviewAnswers(updatedAnswers);
      
      // Check if this was the last question
      if (currentQuestionIndex >= interviewData.questions.length - 1) {
        // Interview complete
        setCurrentStep('completed');
        await submitInterview(updatedAnswers);
        return;
      }
      
      // Move to next question
      const nextQuestionIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextQuestionIndex);
      setCurrentStep('transition-playing');
      
      // Play transition and next question
      try {
        const transition = interviewData.transitions && interviewData.transitions[nextQuestionIndex];
        console.log('Raw transition value for index', nextQuestionIndex, ':', transition);
        if (transition && typeof transition === 'object' && transition.text) {
          console.log('Transition is object, using .text:', transition.text);
          await speak(transition.text);
        } else if (typeof transition === 'string' && transition.trim().length > 0) {
          console.log('Transition is string:', transition);
          await speak(transition);
        } else {
          console.warn('No valid transition found for index', nextQuestionIndex, ':', transition);
        }
        setCurrentStep('question-playing');
        console.log('About to speak question:', interviewData.questions[nextQuestionIndex].text);
        await speak(interviewData.questions[nextQuestionIndex].text);
        setCurrentStep('question-recording');
      } catch (error) {
        console.error('Error in transition/question:', error);
      }
    }
    
    resetTranscript();
  };

  const submitInterview = async (finalAnswers: InterviewAnswer[]) => {
    setCurrentStep('submitting');
    try {
      onComplete(finalAnswers);
    } catch (error) {
      console.error('Error submitting interview:', error);
      alert('Error submitting interview. Please try again.');
      setCurrentStep('completed');
    }
  };

  const getCurrentStatusText = () => {
    switch (currentStep) {
      case 'intro-playing':
        return isPlaying ? 'Playing introduction...' : 'Introduction ready';
      case 'intro-recording':
        return 'Please introduce yourself';
      case 'transition-playing':
        return isPlaying ? 'Moving to next question...' : 'Transition complete';
      case 'question-playing':
        return isPlaying ? `Playing question ${currentQuestionIndex + 1}...` : 'Question ready';
      case 'question-recording':
        return `Recording answer for question ${currentQuestionIndex + 1}`;
      case 'completed':
        return 'Interview completed!';
      case 'submitting':
        return 'Submitting your interview...';
      default:
        return 'Ready';
    }
  };

  const getProgressPercentage = () => {
    if (currentStep === 'intro-playing' || currentStep === 'intro-recording') {
      return 0;
    }
    if (currentStep === 'completed' || currentStep === 'submitting') {
      return 100;
    }
    return ((currentQuestionIndex + 1) / interviewData.questions.length) * 100;
  };

  const canRecord = (currentStep === 'intro-recording' || currentStep === 'question-recording') && !isPlaying;
  const showRecordingControls = currentStep === 'intro-recording' || currentStep === 'question-recording';
  const showSubmitButton = transcript.trim().length > 0 && !isPlaying && !isRecording;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <button onClick={onBack} style={{ padding: '10px 20px', marginRight: '10px', cursor: 'pointer' }}>
          ← Back to Home
        </button>
        <h1>AI Interview Session</h1>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#f0f0f0', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
          <div 
            style={{ 
              backgroundColor: '#007bff', 
              height: '100%', 
              width: `${getProgressPercentage()}%`, 
              transition: 'width 0.3s ease'
            }}
          />
        </div>
        <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
          {currentStep === 'intro-playing' || currentStep === 'intro-recording' ? 'Introduction' : 
           currentStep === 'completed' || currentStep === 'submitting' ? 'Complete' :
           `Question ${currentQuestionIndex + 1} of ${interviewData.questions.length}`}
        </p>
      </div>

      {/* Status Card */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h2 style={{ marginTop: '0', marginBottom: '15px' }}>
          {currentStep === 'intro-playing' || currentStep === 'intro-recording' ? '🎤 Introduction' :
           currentStep === 'transition-playing' ? '✨ Transition' :
           currentStep === 'question-playing' || currentStep === 'question-recording' ? `📋 Question ${currentQuestionIndex + 1}` :
           currentStep === 'completed' ? '✅ Interview Complete' :
           currentStep === 'submitting' ? '📤 Submitting' : ''}
        </h2>
        
        <p><strong>Status:</strong> {getCurrentStatusText()}</p>
        
        {(currentStep === 'intro-recording') && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
            <p><strong>Please introduce yourself and tell us about your professional journey.</strong></p>
          </div>
        )}
        
        {(currentStep === 'question-recording') && currentQuestionIndex >= 0 && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '5px' }}>
            <p><strong>Question:</strong> {interviewData.questions[currentQuestionIndex].text}</p>
          </div>
        )}
      </div>

      {/* Recording Controls */}
      {showRecordingControls && (
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              disabled={!canRecord}
              style={{
                backgroundColor: canRecord ? '#dc3545' : '#ccc',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '8px',
                cursor: canRecord ? 'pointer' : 'not-allowed',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              🎙️ Start Recording
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              ⏹️ Stop Recording
            </button>
          )}
          
          {isRecording && (
            <div style={{ marginTop: '15px', color: '#dc3545', fontWeight: 'bold', fontSize: '18px' }}>
              🔴 Recording in progress... (Keep speaking, I'm listening!)
            </div>
          )}
        </div>
      )}

      {/* Transcript Display */}
      {transcript && (
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Your Response:</h3>
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#ffffff', 
            borderRadius: '5px',
            fontStyle: 'italic',
            border: '1px solid #e9ecef',
            minHeight: '60px'
          }}>
            {transcript}
          </div>
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            <strong>Duration:</strong> {recordingDuration.toFixed(1)} seconds
            {isRecording && <span style={{ color: '#dc3545', marginLeft: '10px' }}>(Still recording...)</span>}
          </p>
          
          {showSubmitButton && (
            <button
              onClick={handleSubmitResponse}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                marginTop: '15px'
              }}
            >
              Submit Response & Continue
            </button>
          )}
        </div>
      )}

      {/* Interview Progress Summary */}
      {interviewAnswers.length > 0 && (
        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <h3>Progress Summary:</h3>
          <ul style={{ paddingLeft: '20px' }}>
            {interviewAnswers.map((answer, index) => (
              <li key={answer.question_id} style={{ marginBottom: '8px' }}>
                {answer.question_id === 0 ? 'Introduction' : `Question ${index}`}: 
                Answered ({answer.answer_duration.toFixed(1)}s)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Debug Info */}
      <div style={{ marginTop: '30px', fontSize: '12px', color: '#999', padding: '10px', backgroundColor: '#f9f9f9' }}>
        <p><strong>Debug Info:</strong></p>
        <p>Step: {currentStep} | Question Index: {currentQuestionIndex} | Playing: {isPlaying ? 'Yes' : 'No'} | Recording: {isRecording ? 'Yes' : 'No'} | Listening: {listening ? 'Yes' : 'No'}</p>
        <p>Responses Collected: {interviewAnswers.length}</p>
      </div>
    </div>
  );
}