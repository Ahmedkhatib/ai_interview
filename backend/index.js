require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase
try {
  let firebaseCredentials;
  if (process.env.FIREBASE_CREDENTIALS) {
    firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  } else {
    firebaseCredentials = require('ai-interview-80448-firebase-adminsdk-fbsvc-96a4738af6.json'); // Update path if needed
  }
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials),
  });
} catch (error) {
  console.error('Error initializing Firebase:', error.message);
  process.exit(1);
}
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

// Submit answers
app.post('/submit-answers', async (req, res) => {
  try {
    const { questions, answers, skills } = req.body;
    const analysis = { skills: [], correctness: [], weakSkills: [] };
    let totalScore = 0;

    for (let i = 0; i < questions.length; i++) {
      const prompt = `Evaluate this answer for the question "${questions[i]}": "${answers[i]}". Provide a score (0–100) and identify the primary skill tested. Format response as: Score: <number>, Skill: <skill>.`;
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const scoreMatch = response.match(/Score: (\d+)/);
      const skillMatch = response.match(/Skill: ([\w\s]+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
      const skill = skillMatch ? skillMatch[1] : skills[0];

      totalScore += score;
      if (!analysis.skills.includes(skill)) {
        analysis.skills.push(skill);
        analysis.correctness.push([]);
      }
      const skillIndex = analysis.skills.indexOf(skill);
      analysis.correctness[skillIndex].push(score);
    }

    // Calculate average correctness per skill
    analysis.correctness = analysis.correctness.map(scores =>
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
    // Identify weak skills (below 70%)
    analysis.weakSkills = analysis.skills.filter(
      (_, i) => analysis.correctness[i] < 70
    );
    // Estimate interview success probability
    const successProbability = Math.min(100, totalScore / questions.length * 1.5);

    res.json({
      skills: analysis.skills,
      correctness: analysis.correctness,
      weakSkills: analysis.weakSkills,
      successProbability,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));