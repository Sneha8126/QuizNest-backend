import { Router } from 'express';
import { Quiz } from '../models/Quiz';

const router = Router();

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[char] as string));
}

// Lightweight browser fallback for shared HTTPS links. The native app can intercept
// the same URL through Android/iOS app-link configuration when the domain is verified.
router.get('/quiz/:code', async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const quiz = await Quiz.findOne({ shareCode: code, status: 'published' }).select('title shareCode');
  if (!quiz) {
    return res.status(404).send('<!doctype html><html><body><h1>Quiz not found</h1><p>This quiz is unavailable.</p></body></html>');
  }

  const title = escapeHtml(quiz.title);
  const deepLink = `quiznest://quiz/${encodeURIComponent(quiz.shareCode)}`;
  const safeCode = escapeHtml(quiz.shareCode);

  return res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#FDFBFF" />
  <title>${title} · QuizNest</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#FDFBFF;color:#2F2A3A;font-family:Inter,system-ui,-apple-system,sans-serif}
    main{width:min(420px,calc(100% - 40px));box-sizing:border-box;background:#fff;border:1px solid #E8E2F6;border-radius:24px;padding:32px;text-align:center;box-shadow:0 12px 40px rgba(47,42,58,.08)}
    .mark{width:64px;height:64px;margin:0 auto 18px;border-radius:18px;background:#EAE7FF;display:grid;place-items:center;color:#7C6CF2;font-size:30px}
    h1{font-size:24px;margin:0 0 10px}p{color:#716B7E;line-height:1.5}.code{font-weight:800;letter-spacing:4px;color:#7C6CF2;font-size:28px;margin:18px 0}
    a{display:inline-block;padding:13px 20px;border-radius:999px;background:#7C6CF2;color:#fff;text-decoration:none;font-weight:700}
  </style>
</head>
<body>
  <main>
    <div class="mark">✓</div>
    <h1>${title}</h1>
    <p>Open this quiz in the QuizNest mobile app.</p>
    <div class="code">${safeCode}</div>
    <a href="${deepLink}">Open in QuizNest</a>
  </main>
  <script>setTimeout(function(){ window.location.href = ${JSON.stringify(deepLink)}; }, 250);</script>
</body>
</html>`);
});

export default router;
