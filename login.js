require('dotenv').config();
const { chromium } = require('playwright');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

(async () => {
  const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
  
});

  const page = await browser.newPage();

  try {
    // =========================
    // LOGIN
    // =========================
    await page.goto('https://vtu.internyet.in/sign-in', {
      waitUntil: 'networkidle'
    });

    await page.fill('input[autocomplete="email"]', process.env.EMAIL);
    await page.fill('#password', process.env.PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');
    console.log("Login successful");

    // Close popup if exists
    try {
      await page.click('button:has-text("I Understand")', { timeout: 4000 });
    } catch {}

    // =========================
    // OPEN DIARY
    // =========================
    await page.click('a[title="Internship Diary"]');
    await page.waitForLoadState('networkidle');

    // =========================
    // SELECT INTERNSHIP
    // =========================
    await page.click('#internship_id');
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    // =========================
    // SELECT YESTERDAY
    // =========================
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const day = yesterday.getDate();

    await page.click('button[aria-haspopup="dialog"]');
    await page.waitForSelector('[role="dialog"]');
    await page.locator(`button:has-text("${day}")`).first().click();

    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // =========================
    // CHECK IF ALREADY SUBMITTED
    // =========================
    const diaryFormExists = await page.locator('textarea[name="description"]').count();

    if (diaryFormExists === 0) {
      console.log("Diary already submitted for this date. Skipping...");

      await page.click('button[aria-label="Log out of your account"]');
      console.log("Logged out successfully");

      await browser.close();
      return;
    }

    console.log("Proceeding with diary entry...");

    // =========================
    // 45-DAY TOPIC ROTATION
    // =========================
    const topics = [
      "React Fundamentals and Virtual DOM",
      "JSX and Functional Components",
      "Props and Component Reusability",
      "State Management with useState",
      "Handling Events in React",
      "Forms and Controlled Components",
      "useEffect and Component Lifecycle",
      "Conditional Rendering and Lists",
      "Styling in React",
      "Building a React Dashboard UI",
      "React Router and SPA Architecture",
      "API Integration using Axios",
      "Error Handling and Loading States",
      "Context API for Global State",
      "Performance Optimization",
      "Creating Custom Hooks",
      "JWT Authentication (Frontend)",
      "Mini Authenticated React Project",
      "Node.js Fundamentals",
      "Express Routing and Middleware",
      "REST API Design",
      "Error Handling in Express",
      "JWT Authentication in Express",
      "Connecting Express with PostgreSQL",
      "CRUD APIs",
      "API Validation",
      "Java Backend Fundamentals",
      "Spring Boot Architecture",
      "REST Controllers in Spring Boot",
      "Service Layer Design",
      "JPA and Hibernate",
      "Spring Boot with PostgreSQL",
      "Role-Based Authentication",
      "Exception Handling in Spring",
      "Database Design Basics",
      "ER Diagrams and Normalization",
      "Indexing and Optimization",
      "Transactions and ACID",
      "Advanced SQL Queries",
      "Stored Procedures",
      "React + Express Integration",
      "React + Spring Boot Integration",
      "Environment Variables",
      "Deployment Strategies",
      "Full Stack Final Project"
    ];

    const startDate = new Date("2026-02-01");
    const today = new Date();
    const dayIndex = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const topic = topics[dayIndex % topics.length];

    console.log("Today's Topic:", topic);

    // =========================
    // AI CONTENT GENERATION
    // =========================
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
  "summary": "...150-200 words...",
  "learnings": "...technical insights...",
  "blockers": "...realistic blockers...",
  "hours": number between 6 and 8
}
`
        }
      ]
    });

    const content = JSON.parse(aiResponse.choices[0].message.content);

    console.log("AI content generated");

    // =========================
    // FILL FORM
    // =========================
    await page.fill('textarea[name="description"]', content.summary);
    await page.fill('input[type="number"]', String(content.hours));
    await page.fill('textarea[name="learnings"]', content.learnings);
    await page.fill('textarea[name="blockers"]', content.blockers);

    console.log("Text fields filled");

    // =========================
    // SELECT SKILLS (STABLE SELECTOR)
    // =========================
    await page.waitForSelector('input[role="combobox"]');

    const skills = [
      "HTML",
      "CSS",
      "JavaScript",
      "Java",
      "PostgreSQL",
      "SQL",
      "MySQL",
      "Database design",
      "Git",
      "Node.js",
      "Express",
      "MongoDB",
      "Docker"

    ];

    for (const skill of skills) {
      const skillInput = page.locator('input[role="combobox"]');
      await skillInput.click();
      await skillInput.fill(skill);
      await page.waitForTimeout(300);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }

    console.log("Skills added");

    // =========================
    // SAVE ENTRY
    // =========================
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    console.log("Diary Entry Saved Successfully");

    // =========================
    // LOGOUT
    // =========================
    await page.click('button[aria-label="Logout of your account"]');
    console.log("Logged out successfully");

    await page.waitForTimeout(2000);
    await browser.close();

  } catch (err) {
    console.error("Error occurred:", err);
    await browser.close();
  }
})();