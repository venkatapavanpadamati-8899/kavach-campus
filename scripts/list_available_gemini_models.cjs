const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.log('No key');
  process.exit(1);
}

async function listModels() {
  console.log('Fetching available models from Google API...');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    if (data.models) {
      console.log('Total models available:', data.models.length);
      const generateModels = data.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
      console.log('Supported generateContent models:', generateModels);
    } else {
      console.log('Error listing models:', data);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

listModels();
