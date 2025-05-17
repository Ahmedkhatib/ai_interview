import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    userId: '',
    location: 'Dubai',
    resume: '',
    skills: '',
    seniority: 'fresher',
  });
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setProfile((prev) => ({ ...prev, userId: currentUser.uid }));
      } else {
        setProfile((prev) => ({ ...prev, userId: '' }));
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setError('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError('Authentication failed: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setQuestions([]);
      setAnswers([]);
      setAnalysis(null);
      setError('');
    } catch (err) {
      setError('Logout failed: ' + err.message);
    }
  };

  const handleProfileSubmit = async () => {
    if (!user) {
      setError('Please log in to save profile');
      return;
    }
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

  const fetchQuestions = async (specificSkills = null) => {
    if (!user) {
      setError('Please log in to start interview');
      return;
    }
    try {
      const skillsToUse = specificSkills || profile.skills.split(',').map(s => s.trim());
      const res = await axios.post('http://localhost:3000/generate-questions', {
        skills: skillsToUse,
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
    if (!user) {
      setError('Please log in to submit answers');
      return;
    }
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

  if (!user) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
        <h1>Interview AI</h1>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <h2>{isSignup ? 'Sign Up' : 'Log In'}</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', margin: '10px 0', width: '100%' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', margin: '10px 0', width: '100%' }}
        />
        <button onClick={handleAuth}>
          {isSignup ? 'Sign Up' : 'Log In'}
        </button>
        <button
          onClick={() => setIsSignup(!isSignup)}
          style={{ marginLeft: '10px' }}
        >
          {isSignup ? 'Switch to Log In' : 'Switch to Sign Up'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Interview AI</h1>
      <p>Welcome, {user.email} <button onClick={handleLogout} style={{ marginLeft: '10px' }}>Log Out</button></p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <section>
        <h2>Profile</h2>
        <input
          placeholder="Location (e.g., Dubai)"
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
          <option value="mid-level">Mid-level</option>
        </select>
        <button onClick={handleProfileSubmit}>Save Profile</button>
        <button onClick={() => fetchQuestions()} style={{ marginLeft: '10px' }}>
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
          <Bar
            data={{
              labels: analysis.skills,
              datasets: [
                {
                  label: 'Correctness (%)',
                  data: analysis.correctness,
                  backgroundColor: 'rgba(75, 192, 192, 0.5)',
                  borderColor: 'rgba(75, 192, 192, 1)',
                  borderWidth: 1,
                },
              ],
            }}
            options={{
              scales: {
                y: { beginAtZero: true, max: 100 },
              },
            }}
          />
          <h3>Skills Performance</h3>
          <ul>
            {analysis.skills.map((skill, i) => (
              <li key={i}>
                {skill}: {analysis.correctness[i].toFixed(2)}%
                {analysis.weakSkills.includes(skill) && ' (Weak)'}
              </li>
            ))}
          </ul>
          {analysis.weakSkills.length > 0 && (
            <button
              onClick={() => fetchQuestions(analysis.weakSkills)}
              style={{ marginTop: '10px' }}
            >
              Practice Weak Skills
            </button>
          )}
        </section>
      )}
    </div>
  );
}

export default App;