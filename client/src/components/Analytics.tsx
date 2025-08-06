'use client';

interface EvaluationResponse {
  overall_score: number;
  overall_feedback: string;
  question_analysis: Array<{
    question_id: number;
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }>;
  analytics: {
    total_duration: string;
    average_response_time: number;
    speaking_pace: string;
    technical_depth: string;
    communication_clarity: string;
  };
  recommendations: string[];
}

interface AnalyticsProps {
  results: EvaluationResponse;
  onStartOver: () => void;
}

export default function Analytics({ results, onStartOver }: AnalyticsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 8) return '#28a745'; // Green
    if (score >= 6) return '#ffc107'; // Yellow
    return '#dc3545'; // Red
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Average';
    return 'Needs Improvement';
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1>📊 Interview Results & Analytics</h1>
        <button 
          onClick={onStartOver}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Start New Interview
        </button>
      </div>

      {/* Overall Score Section */}
      <div style={{ 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <h2>Overall Performance</h2>
        <div style={{ 
          fontSize: '48px', 
          fontWeight: 'bold', 
          color: getScoreColor(results.overall_score),
          margin: '10px 0'
        }}>
          {results.overall_score.toFixed(1)}/10
        </div>
        <div style={{ 
          fontSize: '18px', 
          color: getScoreColor(results.overall_score),
          fontWeight: 'bold',
          marginBottom: '15px'
        }}>
          {getScoreLabel(results.overall_score)}
        </div>
        <div style={{ fontSize: '16px', lineHeight: '1.5' }}>
          {results.overall_feedback}
        </div>
      </div>

      {/* Analytics Summary */}
      <div style={{ marginBottom: '30px' }}>
        <h2>📈 Performance Analytics</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px',
          marginTop: '15px'
        }}>
          <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Duration</h4>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
              {results.analytics.total_duration}
            </div>
          </div>
          
          <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Avg Response Time</h4>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
              {results.analytics.average_response_time.toFixed(1)}s
            </div>
          </div>
          
          <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Speaking Pace</h4>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
              {results.analytics.speaking_pace}
            </div>
          </div>
          
          <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Technical Depth</h4>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
              {results.analytics.technical_depth}
            </div>
          </div>
          
          <div style={{ padding: '15px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Communication</h4>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
              {results.analytics.communication_clarity}
            </div>
          </div>
        </div>
      </div>

      {/* Question-by-Question Analysis */}
      <div style={{ marginBottom: '30px' }}>
        <h2>📝 Question Analysis</h2>
        {results.question_analysis.map((question, index) => (
          <div 
            key={question.question_id} 
            style={{ 
              marginBottom: '20px', 
              padding: '20px', 
              backgroundColor: '#ffffff', 
              border: '1px solid #dee2e6',
              borderRadius: '8px'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h3 style={{ margin: 0 }}>Question {index + 1}</h3>
              <div style={{ 
                backgroundColor: getScoreColor(question.score),
                color: 'white',
                padding: '5px 15px',
                borderRadius: '20px',
                fontWeight: 'bold'
              }}>
                {question.score}/10
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <strong>Feedback:</strong>
              <p style={{ margin: '5px 0', lineHeight: '1.5' }}>{question.feedback}</p>
            </div>
            
            {question.strengths.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#28a745' }}>✅ Strengths:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {question.strengths.map((strength, i) => (
                    <li key={i} style={{ color: '#28a745' }}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {question.improvements.length > 0 && (
              <div>
                <strong style={{ color: '#dc3545' }}>🔍 Areas for Improvement:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {question.improvements.map((improvement, i) => (
                    <li key={i} style={{ color: '#dc3545' }}>{improvement}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recommendations Section */}
      <div style={{ marginBottom: '30px' }}>
        <h2>💡 Recommendations for Improvement</h2>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7',
          borderRadius: '8px'
        }}>
          {results.recommendations.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {results.recommendations.map((recommendation, index) => (
                <li key={index} style={{ marginBottom: '8px', lineHeight: '1.5' }}>
                  {recommendation}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0 }}>Great job! No specific recommendations at this time.</p>
          )}
        </div>
      </div>

      {/* Score Distribution Visualization */}
      <div style={{ marginBottom: '30px' }}>
        <h2>📊 Score Distribution</h2>
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          {results.question_analysis.map((question, index) => (
            <div key={question.question_id} style={{ marginBottom: '15px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '5px' 
              }}>
                <span>Question {index + 1}</span>
                <span style={{ fontWeight: 'bold' }}>{question.score}/10</span>
              </div>
              <div style={{ 
                backgroundColor: '#e9ecef', 
                height: '20px', 
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  backgroundColor: getScoreColor(question.score),
                  height: '100%',
                  width: `${(question.score / 10) * 100}%`,
                  borderRadius: '10px',
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          ))}
          
          <div style={{ 
            marginTop: '20px', 
            paddingTop: '15px', 
            borderTop: '2px solid #dee2e6' 
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '5px' 
            }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Overall Average</span>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {results.overall_score.toFixed(1)}/10
              </span>
            </div>
            <div style={{ 
              backgroundColor: '#e9ecef', 
              height: '25px', 
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                backgroundColor: getScoreColor(results.overall_score),
                height: '100%',
                width: `${(results.overall_score / 10) * 100}%`,
                borderRadius: '12px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data Section (for debugging) */}
      <div style={{ marginBottom: '20px' }}>
        <details>
          <summary style={{ 
            cursor: 'pointer', 
            fontWeight: 'bold',
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '5px'
          }}>
            🔍 View Raw Data (Debug)
          </summary>
          <div style={{ 
            marginTop: '10px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '5px',
            fontSize: '12px',
            fontFamily: 'monospace',
            overflow: 'auto'
          }}>
            <pre>{JSON.stringify(results, null, 2)}</pre>
          </div>
        </details>
      </div>

      {/* Action Buttons */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button 
          onClick={onStartOver}
          style={{
            backgroundColor: '#28a745',
            color: 'white',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          🚀 Start Another Interview
        </button>
      </div>

      {/* Footer Info */}
      <div style={{ 
        marginTop: '40px', 
        padding: '15px', 
        backgroundColor: '#e9ecef', 
        borderRadius: '5px',
        textAlign: 'center',
        color: '#6c757d',
        fontSize: '14px'
      }}>
        <p style={{ margin: 0 }}>
          Interview completed successfully! Your performance data has been analyzed using AI evaluation.
        </p>
        <p style={{ margin: '5px 0 0 0' }}>
          Keep practicing to improve your interview skills. Good luck with your job search! 🍀
        </p>
      </div>
    </div>
  );
}