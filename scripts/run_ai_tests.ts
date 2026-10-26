import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Adjust path depending on where script is run
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'MISSING' });

async function analyzeIncident(description: string) {
  try {
    const prompt = `
    You are a campus safety AI. Analyze the following student complaint.
    Determine the category, suggested severity (L1, L2, L3, L4), urgency (LOW, MEDIUM, HIGH, CRITICAL), 
    confidence score (0.0-1.0), and a brief summary.
    Return JSON format: { "category": string, "severity": string, "urgency": string, "confidence": number, "summary": string }
    
    Complaint: "${description}"
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    return {
      category: 'UNCLASSIFIED',
      severity: 'L1',
      urgency: 'LOW',
      confidence: 0,
      summary: 'AI analysis failed. Requires human review.',
    };
  }
}

const testCases = [
  { id: 'AI-01', desc: 'There is a suspicious person near the library' },
  { id: 'AI-02', desc: 'Someone has a gun at the cafeteria' },
  { id: 'AI-03', desc: 'Water leak in dorm 4' },
  { id: 'AI-04', desc: 'A student fainted and is bleeding from their head' },
  { id: 'AI-05', desc: 'A stray dog is barking at students' },
  { id: 'AI-06', desc: 'Fire in the chemistry lab!' },
  { id: 'AI-07', desc: 'My laptop got stolen from the study room' },
  { id: 'AI-08', desc: 'There is a huge fight happening in the parking lot' },
  { id: 'AI-09', desc: 'Some guy is creeping around the girls hostel' },
  { id: 'AI-10', desc: 'I need to talk to a counselor, feeling very depressed and might do something bad.' },
  { id: 'AI-11', desc: 'The Wi-Fi in block B is completely down' },
  { id: 'AI-12', desc: 'I am being kidnapped, please help!' }
];

async function runTests() {
  const results = [];
  console.log('Running AI Tests...');
  for (const tc of testCases) {
    console.log(`Testing [${tc.id}]...`);
    const result = await analyzeIncident(tc.desc);
    results.push({ id: tc.id, description: tc.desc, result });
  }

  const reportPath = path.join(process.cwd(), 'docs/KAVACH_CAMPUS_AI_CLASSIFICATION_TESTS.md');
  
  let markdown = '# KAVACH CAMPUS - AI CLASSIFICATION TESTS\n\n';
  markdown += '## Execution Results\n\n';
  
  for (const r of results) {
    markdown += `### Case ${r.id}\n`;
    markdown += `- **Input**: "${r.description}"\n`;
    markdown += `- **Category**: ${r.result.category}\n`;
    markdown += `- **Severity**: ${r.result.severity}\n`;
    markdown += `- **Urgency**: ${r.result.urgency}\n`;
    markdown += `- **Summary**: ${r.result.summary}\n\n`;
  }

  fs.writeFileSync(reportPath, markdown);
  console.log(`Saved report to ${reportPath}`);
}

runTests().catch(console.error);
