require('dotenv').config();
const express = require('express');
const { chromium } = require('playwright');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =========================
// MAIN AUTOMATION FUNCTION
// =========================
async function runDiaryAutomation() {

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {

    await page.goto('https://vtu.internyet.in/sign-in', {
      waitUntil: 'networkidle'
    });

    await page.fill('input[autocomplete="email"]', process.env.EMAIL);
    await page.fill('#password', process.env.PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    try {
      await page.click('button:has-text("I Understand")', { timeout: 4000 });
    } catch {}

await page.locator('a[title="Internship Diary"]').click({ force: true });    a
await page.waitForLoadState('networkidle');

    await page.click('#internship_id');
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const day = yesterday.getDate();

    await page.click('button[aria-haspopup="dialog"]');
    await page.waitForSelector('[role="dialog"]');
    await page.locator(`button:has-text("${day}")`).first().click();

    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    const diaryFormExists = await page.locator('textarea[name="description"]').count();

    if (diaryFormExists === 0) {
      console.log("Diary already submitted.");
      await browser.close();
      return "Already Submitted";
    }

    // =========================
    // TOPIC ROTATION
    // =========================
    const topics = [
  // ======================
  // PHASE 1 – JavaScript Foundations
  // ======================
  "JavaScript Fundamentals (ES6+)",
  "Variables, Scope, and Closures",
  "Arrays and Array Methods",
  "Objects and Destructuring",
  "Functions and Arrow Functions",
  "Promises and Async/Await",
  "Modules (Import/Export)",
  "Fetch API and Basic API Calls",

  // ======================
  // PHASE 2 – React Core
  // ======================
  "React Fundamentals and Virtual DOM",
  "JSX and Functional Components",
  "Props and Component Reusability",
  "useState Deep Dive",
  "Event Handling in React",
  "Conditional Rendering",
  "Rendering Lists and Keys",
  "Forms and Controlled Components",
  "useEffect and Lifecycle",
  "Custom Hooks",
  "React Folder Structure & Best Practices",
  "Styling in React (CSS Modules / Tailwind)",

  // ======================
  // PHASE 3 – Advanced React
  // ======================
  "React Router and SPA Architecture",
  "Dynamic Routes and URL Parameters",
  "Axios and API Integration",
  "Handling Loading and Error States",
  "Context API for Global State",
  "Performance Optimization (memo, useMemo, useCallback)",
  "Refs and useRef",
  "Protected Routes",
  "JWT Authentication (Frontend)",
  "Building a React Dashboard Project",

  // ======================
  // PHASE 4 – Node.js Fundamentals
  // ======================
  "Node.js Fundamentals",
  "Node Modules and NPM",
  "File System Module",
  "Understanding the Event Loop",
  "Creating a Basic HTTP Server",
  "Environment Variables (.env)",

  // ======================
  // PHASE 5 – Express.js Backend
  // ======================
  "Express Setup and Project Structure",
  "Express Routing",
  "Middleware Explained",
  "REST API Design Principles",
  "CRUD APIs with Express",
  "Error Handling in Express",
  "API Validation (Joi / express-validator)",
  "JWT Authentication in Express",
  "Role-Based Authorization",

  // ======================
  // PHASE 6 – MongoDB & Mongoose
  // ======================
  "MongoDB Fundamentals",
  "Installing and Connecting MongoDB",
  "Mongoose Introduction",
  "Schemas and Models",
  "CRUD Operations with MongoDB",
  "Relationships and Population",
  "Indexing and Optimization",

  // ======================
  // PHASE 7 – Full Stack Integration
  // ======================
  "Connecting React to Express Backend",
  "Full Authentication Flow (Login/Register)",
  "Refresh Tokens & Secure Cookies",
  "Handling CORS and Security",
  "Deployment Strategy (Frontend + Backend)",

  // ======================
  // PHASE 8 – Production & Final Project
  // ======================
  "Deploying to Render / Vercel / Railway",
  "Performance Optimization & Production Best Practices",
  "Complete Production-Ready MERN Final Project"
];

    const startDate = new Date("2026-02-23");
    const today = new Date();
    const dayIndex = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const topic = topics[dayIndex % topics.length];

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: "You are a professional web development intern writing realistic internship diary entries."
        },
        {
          role: "user",
          content: `
Generate a structured internship diary entry for topic: ${topic}.

Return STRICT JSON:

{
  "summary": "...",
  "learnings": "...",
  "blockers": "...",
  "hours": number between 6 and 8
}
`
        }
      ]
    });

    const content = JSON.parse(aiResponse.choices[0].message.content);

    await page.fill('textarea[name="description"]', content.summary);
    await page.fill('input[type="number"]', String(content.hours));
    await page.fill('textarea[name="learnings"]', content.learnings);
    await page.fill('textarea[name="blockers"]', content.blockers);

    await page.waitForSelector('input[role="combobox"]');

    const skills = [
      "HTML", "CSS", "JavaScript",
      "Java", "PostgreSQL"
    ];

    for (const skill of skills) {
      const skillInput = page.locator('input[role="combobox"]');
      await skillInput.click();
      await skillInput.fill(skill);
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }

    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    await page.click('button[aria-label="Log out of your account"]');

    await browser.close();

    return "Diary Saved Successfully";

  } catch (err) {
    await browser.close();
    throw err;
  }
}

// =========================
// WEBHOOK ROUTE
// =========================
app.post('/run-diary', async (req, res) => {

  // Optional Security
  if (req.headers.authorization !== `Bearer ${process.env.SECRET}`) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const result = await runDiaryAutomation();
    res.json({ success: true, message: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send("Diary Automation API Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});