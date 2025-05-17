app.post('/submit-answers', async (req, res) => {
  try {
    const { questions, answers, skills } = req.body;
    const analysis = { skills: [], correctness: [], weakSkills: [] };
    let totalScore = 0;

    for (let i = 0; i < questions.length; i++) {
      const prompt = `Evaluate this answer for the question "${questions[i]}": "${answers[i]}". Provide a score (0–100) and identify the primary skill tested.`;
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const score = parseInt(response.match(/Score: (\d+)/)?.[1] || 50);
      const skill = response.match(/Skill: ([\w\s]+)/)?.[1] || skills[0];
      
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
    // Estimate interview success probability (simple heuristic)
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