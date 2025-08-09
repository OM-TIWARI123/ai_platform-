# AI Interview Platform - Agent Instructions

## Project Architecture

### Frontend (Next.js 14 App Router)
- `client/src/app/` - Main application routes and API endpoints
- `client/src/components/` - React components including Interview UI
- Authentication flow via Clerk (`auth/` directory)
- Server actions in `actions/` for data mutations

### Backend (FastAPI)
- `neo4j_testing/` - Core backend services
- RESTful API endpoints for interview management
- Integration with AI services (Gemini, ElevenLabs)

## Key Workflows

### Authentication Flow
```typescript
// client/src/app/auth/callback/page.tsx
// Clerk auth -> Create/fetch user -> Redirect to interface
const auth = await onAuthenticateUser()
if(auth.status === 200 || auth.status === 201) {
    return redirect(`/interface/${auth.user?.id}`)
}
```

### Interview Process
1. Resume Upload & Analysis
2. AI Question Generation
3. Speech-to-Text Interview
4. Real-time Audio Synthesis
5. Response Evaluation

## Critical Patterns

### Server Actions
- Direct database mutations via server actions in `actions/`
- Type-safe request/response models using Prisma
```typescript
// client/src/app/actions/user.ts
'use server'
export const onAuthenticateUser = async () => {
    const user = await currentUser()
    // DB operations
}
```

### AI Integration
- Question Generation: Gemini AI API
- Voice Synthesis: ElevenLabs API
- Speech Recognition: Web Speech API

### State Management
- Server-side: Session-based via Prisma
- Client-side: React state for interview flow

## Environment Setup
Required environment variables:
```
GOOGLE_API_KEY=<gemini-key>
ELEVENLABS_API_KEY=<tts-key>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-key>
CLERK_SECRET_KEY=<clerk-secret>
DATABASE_URL=<postgresql-url>
```

## Development Commands
```bash
# Frontend
cd client
npm install
npm run dev

# Backend
cd neo4j_testing
python -m venv venv
source venv/bin/activate  # or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

## Integration Points
1. Frontend → Backend API (`http://localhost:8000`)
2. Backend → AI Services
   - Gemini: Question generation
   - ElevenLabs: Text-to-speech
3. Frontend → Clerk Auth
4. Database: PostgreSQL via Prisma

## Common Tasks
- Adding new interview question types: Extend `QuestionGenerator` service
- Custom evaluation metrics: Update `EvaluationService`
- New UI states: Modify `Interview.tsx` state machine
