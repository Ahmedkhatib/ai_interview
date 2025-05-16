# AI Interview

A web and mobile app to practice interviews with AI-generated questions based on skill sets and seniority.

## Project Structure
- `backend/`: Node.js/Express server with Firebase and Gemini API.
- `web/`: React app for the web frontend.
- `mobile/`: React Native app for iOS/Android (TBD).

## Setup
1. Clone the repo: `git clone <repo-url>`
2. Backend:
   - `cd backend`
   - `npm install`
   - Copy `.env.example` to `.env` and add `GOOGLE_API_KEY` and `FIREBASE_CREDENTIALS`.
   - `node index.js`
3. Web (TBD):
   - `cd web`
   - `npm install`
   - `npm start`

## APIs
- `POST /submit-profile`: Save user profile.
- `POST /generate-questions`: Generate 30 interview questions.