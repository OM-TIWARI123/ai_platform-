import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Murf API Key present:', !!process.env.MURF_API_KEY);
    
    const requestData = await request.json();
    const text = requestData.text;
    console.log('Request data:', requestData);
    console.log('Text to convert:', text);
    
    // Ensure text is a string
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }

    const requestBody = {
      text: text, // Make sure this is just the string, not an object
      voiceId: "en-US-natalie", // You can change this to other voices like "en-US-mike", "en-US-sarah", etc.
    };

    console.log('Sending to Murf:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://api.murf.ai/v1/speech/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.MURF_API_KEY!,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Get detailed error information
      const errorText = await response.text();
      console.log("Murf API Error status:", response.status);
      console.log("Murf API Error response:", errorText);
      
      return NextResponse.json({ 
        error: 'Murf AI API failed',
        status: response.status,
        details: errorText
      }, { status: response.status });
    }

    // Since Murf returns a stream, we need to convert it to a buffer
    const audioBuffer = await response.arrayBuffer();
    console.log('Audio buffer size:', audioBuffer.byteLength);

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav', // Murf typically returns WAV format
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error) {
    console.error('Murf TTS Error:', error);
    return NextResponse.json({ 
      error: 'TTS failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}