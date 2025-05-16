require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS)),
});
const db = admin.firestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Submit user profile
app.post('/submit-profile', async (req, res) => {
  try {
    const { userId, location, resume, skills, seniority } = req.body;
    await db.collection('users').doc(userId).set({
      location,
      resume,
      skills,
      seniority,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(200).json({ message: 'Profile saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate questions
app.post('/generate-questions', async (req, res) => {
  try {
    const { skills, seniority } = req.body;
    const prompt = `Generate 30 interview questions for a ${seniority} candidate with skills: ${skills.join(', ')}. Format as a numbered list.`;
    const result = await model.generateContent(prompt);
    const questions = result.response.text()
      .split('\n')
      .filter(q => q.match(/^\d+\./))
      .map(q => q.trim());
    res.json(questions.slice(0, 30));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));