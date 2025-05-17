import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // Optional: Add basic styling

function App() {
  const [profile, setProfile] = useState({
    userId: 'test-user',
    location: '',
    resume: '',
    skills: '',
    seniority: 'fresher',
  });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  const handleProfileSubmit = async () => {
    try {
      await axios.post('http://localhost:3000/submit-profile', {
        ...profile,
        skills: profile.skills.split(',').map(s => s.trim()),
      });
      alert('Profile saved!');
      setError('');
    } catch (err) {
      setError('Error saving profile: ' + err.message);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await axios.post('http://localhost:3000/generate-questions', {
        skills: profile.skills.split(',').map(s => s.trim()),
        seniority: profile.seniority,
      });
      setQuestions(res.data);
      setAnswers(new Array(res.data.length).fill(''));
      setAnalysis(null);
      setError('');
    } catch (err) {
      setError('Error fetching questions: ' + err.message);
    }
  };

  const submitAnswers = async () => {
    try {
      const res = await axios.post('http://localhost:3000/submit-answers', {
        questions,
        answers,
        skills: profile.skills.split(',').map(s => s.trim()),
      });
      setAnalysis(res.data);
      setError('');
    } catch (err) {
      setError('Error analyzing answers: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Interview AI</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <section>
        <h2>Profile</h2>
        <input
          placeholder="Location"
          value={profile.location}
          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
          style={{ display: 'block', margin: '10px 0', width: '100%' }}
        />
        <textarea
          placeholder="Resume"
          value={profile.resume}
          onChange={(e) => setProfile({ ...profile, resume: e.target.value })}
          style={{ display: 'block', margin: '10px 0', width: '100%', height: '100px' }}
        />
        <input
          placeholder="Skills (comma-separated, e.g., JavaScript, Python)"
          value={profile.skills}
          onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
          style={{ display: 'block', margin: '10px 0', width: '100%' }}
        />
        <select
          value={profile.seniority}
          onChange={(e) => setProfile({ ...profile, seniority: e.target.value })}
          style={{ display: 'block', margin: '10px 0', width: '100%' }}
        >
          <option value="student">Student</option>
          <option value="fresher">Fresher</option>
          <option value="-mid-level">Mid-level</option>
        </select>
        <button onClick={handleProfileSubmit}>Save Profile</button>
        <button onClick={fetchQuestions} style={{ marginLeft: '10px' }}>
          Start Interview
        </button>
      </section>

      {questions.length > 0 && (
        <section style={{ marginTop: '20px' }}>
          <h2>Questions</h2>
          {questions.map((q, i) => (
            <div key={i} style={{ margin: '10px 0' }}>
              <p>{q}</p>
              <input
                type="text"
                value={answers[i] || ''}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[i] = e.target.value;
                  setAnswers(newAnswers);
                }}
                style={{ width: '100%' }}
                placeholder="Enter your answer"
              />
            </div>
          ))}
          <button onClick={submitAnswers}>Submit Answers</button>
        </section>
      )}

      {analysis && (
        <section style={{ marginTop: '20px' }}>
          <h2>Analysis</h2>
          <p>Success Probability: {analysis.successProbability.toFixed(2)}%</p>
          <h3>Skills Performance</h3>
          <ul>
            {analysis.skills.map((skill, i) => (
              <li key={i}>
                {skill}: {analysis.correctness[i].toFixed(2)}%
                {analysis.weakSkills.includes(skill) && ' (Weak)'}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default App;