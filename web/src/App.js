import React, { useState } from 'react';
import axios from 'axios';

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

  const handleProfileSubmit = async () => {
    await axios.post('http://localhost:3000/submit-profile', {
      ...profile,
      skills: profile.skills.split(',').map(s => s.trim()),
    });
    alert('Profile saved!');
  };

  const fetchQuestions = async () => {
    const res = await axios.post('http://localhost:3000/generate-questions', {
      skills: profile.skills.split(',').map(s => s.trim()),
      seniority: profile.seniority,
    });
    setQuestions(res.data);
    setAnswers(new Array(res.data.length).fill(''));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Interview AI</h1>
      <div>
        <h2>Profile</h2>
        <input
          placeholder="Location"
          value={profile.location}
          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
        />
        <textarea
          placeholder="Resume"
          value={profile.resume}
          onChange={(e) => setProfile({ ...profile, resume: e.target.value })}
        />
        <input
          placeholder="Skills (comma-separated)"
          value={profile.skills}
          onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
        />
        <select
          value={profile.seniority}
          onChange={(e) => setProfile({ ...profile, seniority: e.target.value })}
        >
          <option value="student">Student</option>
          <option value="fresher">Fresher</option>
          <option value="midlevel">Mid-level</option>
        </select>
        <button onClick={handleProfileSubmit}>Save Profile</button>
        <button onClick={fetchQuestions}>Start Interview</button>
      </div>
      <div>
        <h2>Questions</h2>
        {questions.map((q, i) => (
          <div key={i}>
            <p>{q}</p>
            <input
              type="text"
              value={answers[i] || ''}
              onChange={(e) => {
                const newAnswers = [...answers];
                newAnswers[i] = e.target.value;
                setAnswers(newAnswers);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;