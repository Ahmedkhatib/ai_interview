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
const model = genAI.getGenerativeModel({ model: 'gemini 1.5 Flash-8B' });

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
    //res.json(questions.slice(0, 30));
    res.json(questions.slice(0, 3));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit answers

// app.post('/submit-answers', async (req, res) => {
//   console.log('Request body:', req.body); // Add this
//   try {
//     const { questions, answers, skills } = req.body;
//     const analysis = { skills: [], correctness: [], weakSkills: [] };
//     let totalScore = 0;

//     for (let i = 0; i < questions.length; i++) {
//       const prompt = `Evaluate this answer for the question "${questions[i]}": "${answers[i]}". Provide a score (0–100) and identify the primary skill tested. Format response as: Score: <number>, Skill: <skill>.`;
//       const result = await model.generateContent(prompt);
//       const response = result.response.text();
//       const scoreMatch = response.match(/Score: (\d+)/);
//       const skillMatch = response.match(/Skill: ([\w\s]+)/);
//       const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
//       const skill = skillMatch ? skillMatch[1] : skills[0];

//       totalScore += score;
//       if (!analysis.skills.includes(skill)) {
//         analysis.skills.push(skill);
//         analysis.correctness.push([]);
//       }
//       const skillIndex = analysis.skills.indexOf(skill);
//       analysis.correctness[skillIndex].push(score);
//     }

//     // Calculate average correctness per skill
//     analysis.correctness = analysis.correctness.map(scores =>
//       scores.reduce((a, b) => a + b, 0) / scores.length
//     );
//     // Identify weak skills (below 70%)
//     analysis.weakSkills = analysis.skills.filter(
//       (_, i) => analysis.correctness[i] < 70
//     );
//     // Estimate interview success probability
//     const successProbability = Math.min(100, totalScore / questions.length * 1.5);

//     res.json({
//       skills: analysis.skills,
//       correctness: analysis.correctness,
//       weakSkills: analysis.weakSkills,
//       successProbability,
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
app.post('/submit-answers', async (req, res) => {
  try {
    const { questions, answers, skills } = req.body;
    // Validate input
    if (!Array.isArray(questions) || !Array.isArray(answers) || !Array.isArray(skills)) {
      return res.status(400).json({ error: 'Questions, answers, and skills must be arrays' });
    }
    if (questions.length === 0 || answers.length === 0 || skills.length === 0) {
      return res.status(400).json({ error: 'Questions, answers, and skills cannot be empty' });
    }
    if (questions.length !== answers.length) {
      return res.status(400).json({ error: 'Questions and answers must have the same length' });
    }

    const analysis = { skills: [], correctness: [], weakSkills: [] };
    let totalScore = 0;

    for (let i = 0; i < questions.length; i++) {
      if (!answers[i] || answers[i].trim() === '') {
        // Skip empty answers but assign a low score
        totalScore += 10;
        if (!analysis.skills.includes(skills[0])) {
          analysis.skills.push(skills[0]);
          analysis.correctness.push([]);
        }
        analysis.correctness[analysis.skills.indexOf(skills[0])].push(10);
        continue;
      }
      const prompt = `Evaluate this answer for the question "${questions[i]}": "${answers[i]}". Provide a score (0–100) and identify the primary skill tested. Format response as: Score: <number>, Skill: <skill>.`;
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const scoreMatch = response.match(/Score: (\d+)/);
      const skillMatch = response.match(/Skill: ([\w\s]+)/);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
      const skill = skillMatch ? skillMatch[1].trim() : skills[0];

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
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
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
    console.error('Error in /submit-answers:', error.message, error.stack);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));