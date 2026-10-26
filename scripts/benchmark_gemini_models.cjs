const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const candidateModels = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-pro-latest'
];

async function testAll() {
  for (const m of candidateModels) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Return a JSON object with key "status" and value "OK"',
        config: { responseMimeType: 'application/json' }
      });
      console.log(`[${m}]: SUCCESS -> ${res.text ? res.text.trim() : 'no text'}`);
    } catch (err) {
      console.log(`[${m}]: FAILED -> ${err.message?.slice(0, 100)}`);
    }
  }
}

testAll();
