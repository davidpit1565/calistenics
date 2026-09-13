// Vercel serverless function — proxies AI Coach chat requests to Anthropic.
// The real API key lives only here, in the ANTHROPIC_API_KEY environment
// variable set in the Vercel project dashboard. It is never sent to the
// client. See AI_COACH_SETUP.md for the exact setup steps.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001'; // fast + cheap, plenty for short coaching replies

const MAX_QUESTION_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 20;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server not configured — ANTHROPIC_API_KEY is missing.' });
    return;
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
    const question = typeof body.question === 'string' ? body.question.slice(0, MAX_QUESTION_LENGTH) : '';
    const context = body.context && typeof body.context === 'object' ? body.context : null;
    const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_MESSAGES) : [];

    if (!question) {
      res.status(400).json({ error: 'Missing question' });
      return;
    }

    const systemPrompt = buildSystemPrompt(context);
    const messages = history
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
      .map(m => ({ role: m.role, content: m.text }));

    // The user's latest question was already appended to history client-side
    // before history was captured for this call in some flows; make sure we
    // always end on a user turn with the actual question, without duplicating.
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== question) {
      messages.push({ role: 'user', content: question });
    }

    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => '');
      res.status(502).json({ error: 'LLM provider error', detail: errText.slice(0, 300) });
      return;
    }

    const data = await anthropicRes.json();
    const answer = (data.content && data.content[0] && data.content[0].text) || "Sorry, I couldn't come up with an answer for that.";
    res.status(200).json({ answer });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error', detail: String(err && err.message || err).slice(0, 300) });
  }
};

function buildSystemPrompt(context) {
  const base = "You are a supportive, knowledgeable calisthenics coach inside the Massa Calisthenics app. " +
    "Answer the user's question about the exercise result below in 2-4 short sentences, plain language, " +
    "encouraging but honest — never vague filler, always something concrete and actionable. " +
    "Never invent numbers you weren't given. Never discuss anything unrelated to this workout result " +
    "or general calisthenics training advice.";

  if (!context) return base;

  const { exerciseName, score, grade, technique, range, control, tempo, reps, isHold } = context;
  const details = [];
  if (exerciseName) details.push(`Exercise: ${exerciseName}`);
  if (score !== undefined) details.push(`Overall score: ${score}/100`);
  if (grade) details.push(`Grade: ${grade}`);
  if (technique !== undefined) details.push(`Technique: ${technique}/100`);
  if (range !== undefined) details.push(`Range of motion: ${range}/100`);
  if (control !== undefined) details.push(`Control: ${control}/100`);
  if (tempo !== undefined) details.push(`Tempo: ${tempo}/100`);
  if (!isHold && reps !== undefined) details.push(`Reps completed: ${reps}`);

  return `${base}\n\nThis result's breakdown:\n${details.join('\n')}`;
}
