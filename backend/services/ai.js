/**
 * KAVACH CAMPUS — AI Analysis Service
 * Analyzes complaints for category, severity, urgency
 * Supports: Gemini API (with key) or rule-based fallback
 */

const { queryOne } = require('../db/database');

// Keywords for rule-based classification
const SEVERITY_RULES = {
  L4: {
    keywords: ['assault', 'attack', 'weapon', 'knife', 'gun', 'fire', 'bomb', 'threat to kill',
      'kill', 'murder', 'dying', 'bleeding', 'unconscious', 'not breathing', 'heart attack',
      'suicide', 'self-harm', 'kidnap', 'abduct', 'hostage', 'shooting', 'explosion',
      'sexual assault', 'rape', 'molest', 'collapsed building', 'trapped', 'drowning'],
    categories: ['ASSAULT', 'MEDICAL_EMERGENCY', 'FIRE', 'WEAPON_THREAT', 'SEXUAL_ASSAULT', 'KIDNAPPING', 'LIFE_THREAT'],
    urgency: 'CRITICAL'
  },
  L3: {
    keywords: ['stalking', 'following me', 'threatening', 'intimidat', 'physical', 'hit me',
      'pushed me', 'harass', 'groping', 'touching inappropriately', 'drugged', 'spiked',
      'blackmail', 'extort', 'serious injury', 'break in', 'intruder', 'unauthorized person',
      'violence', 'aggressive', 'dangerous', 'fear for safety', 'scared for my life'],
    categories: ['STALKING', 'THREAT', 'PHYSICAL_INTIMIDATION', 'HARASSMENT', 'INTRUDER', 'BLACKMAIL'],
    urgency: 'HIGH'
  },
  L2: {
    keywords: ['bully', 'ragging', 'cyber bully', 'online harass', 'repeated', 'continuous',
      'discriminat', 'caste', 'religion', 'gender', 'racial', 'verbal abuse', 'mental',
      'anxiety', 'depression', 'suicidal thoughts', 'eating disorder', 'substance',
      'alcohol', 'drugs', 'smoking', 'cheating', 'fraud', 'theft', 'stolen',
      'missing person', 'not returned', 'sexually suggestive', 'inappropriate messages'],
    categories: ['BULLYING', 'RAGGING', 'CYBERBULLYING', 'DISCRIMINATION', 'MENTAL_HEALTH', 'SUBSTANCE_ABUSE', 'THEFT'],
    urgency: 'HIGH'
  },
  L1: {
    keywords: ['lost', 'found', 'broken', 'maintenance', 'complaint', 'suggestion',
      'feedback', 'parking', 'noise', 'cleanliness', 'food quality', 'canteen',
      'library', 'wifi', 'internet', 'electricity', 'water', 'washroom', 'toilet',
      'attendance', 'exam', 'schedule', 'timetable', 'fee', 'certificate',
      'general', 'minor', 'small issue'],
    categories: ['LOST_ITEM', 'MAINTENANCE', 'GENERAL_COMPLAINT', 'FEEDBACK', 'INFRASTRUCTURE'],
    urgency: 'LOW'
  }
};

const CATEGORY_RULES = {
  'STALKING': ['stalk', 'following', 'watching me', 'tracking me', 'won\'t leave me alone'],
  'HARASSMENT': ['harass', 'bother', 'disturb', 'unwanted contact', 'unwanted attention', 'creep'],
  'BULLYING': ['bully', 'bully', 'pick on', 'tease', 'humiliat'],
  'RAGGING': ['ragging', 'seniors forcing', 'initiation', 'hazing'],
  'THREAT': ['threat', 'threaten', 'will hurt', 'consequences', 'warned me'],
  'PHYSICAL_VIOLENCE': ['hit', 'punch', 'kick', 'slap', 'push', 'beat', 'assault', 'fight', 'attack'],
  'SEXUAL_HARASSMENT': ['sexual', 'inappropriat', 'touch', 'grope', 'molest', 'rape', 'consent'],
  'THEFT': ['stolen', 'theft', 'rob', 'missing', 'took my', 'pickpocket'],
  'SUBSTANCE_ABUSE': ['drug', 'alcohol', 'smoke', 'weed', 'drunk', 'intoxicat'],
  'MENTAL_HEALTH': ['depress', 'anxiety', 'suicid', 'self-harm', 'mental health', 'panic'],
  'DISCRIMINATION': ['caste', 'religion', 'discriminat', 'racist', 'sexist', 'bias'],
  'INFRASTRUCTURE': ['broken', 'repair', 'maintenance', 'electricity', 'water', 'leak'],
  'LOST_ITEM': ['lost', 'found', 'missing item', 'left behind'],
  'EMERGENCY': ['emergency', 'help', 'urgent', 'SOS', 'save me', 'danger'],
  'MEDICAL': ['medical', 'hospital', 'ambulance', 'faint', 'unconscious', 'injury', 'bleed'],
  'FIRE': ['fire', 'smoke', 'burning', 'flame', 'explosion'],
};

/**
 * Analyze a complaint using AI or rule-based engine
 */
async function analyzeComplaint(text) {
  if (!text || text.trim().length === 0) {
    return null;
  }

  // Try Gemini API if configured
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.length > 10) {
    try {
      return await analyzeWithGemini(text, geminiKey);
    } catch (err) {
      console.error('Gemini AI analysis failed, falling back to rule engine:', err.message);
    }
  }

  // Fallback: Rule-based analysis
  const fallbackResult = analyzeWithRules(text);
  fallbackResult.requires_human_review = true;
  fallbackResult.explanation = 'AI analysis unavailable. Human review required. ' + fallbackResult.explanation;
  return fallbackResult;
}

const { GoogleGenAI } = require('@google/genai');

/**
 * Analyze using Google Gemini API
 */
async function analyzeWithGemini(text, apiKey) {
  const client = new GoogleGenAI({ apiKey });
  const prompt = `You are a campus safety AI assistant for Kavach Campus.
Analyze the following student complaint and classify it.

Complaint: "${text}"

Respond in EXACTLY this JSON format:
{
  "category": "<one of: STALKING, HARASSMENT, BULLYING, RAGGING, THREAT, PHYSICAL_VIOLENCE, SEXUAL_HARASSMENT, THEFT, SUBSTANCE_ABUSE, MENTAL_HEALTH, DISCRIMINATION, INFRASTRUCTURE, LOST_ITEM, EMERGENCY, MEDICAL, FIRE, GENERAL>",
  "severity": "<one of: L1, L2, L3, L4>",
  "urgency": "<one of: LOW, NORMAL, HIGH, CRITICAL>",
  "confidence": <number between 0 and 1>,
  "explanation": "<brief explanation of classification>",
  "recommended_recipients": ["<roles like SECURITY, HOD, COUNSELOR, WOMENS_CELL, PRINCIPAL>"],
  "threat_indicators": ["<list any detected threat indicators>"],
  "requires_human_review": <true if confidence < 0.7 or sensitive topic>
}

Rules:
- L4 CRITICAL: Immediate danger, assault in progress, medical emergency, fire
- L3 HIGH: Active stalking, serious threats, physical intimidation
- L2 MODERATE: Bullying, repeated harassment, ragging, discrimination
- L1 LOW: Lost items, minor complaints, infrastructure issues

Be conservative — when uncertain, classify higher severity to ensure safety.`;

  const interaction = await client.interactions.create({
    model: 'gemini-3.8-flash',
    input: prompt
  });

  if (!interaction.output_text) {
    throw new Error('Empty Gemini response');
  }

  // Gemini may sometimes wrap JSON in markdown blocks (e.g., ```json\n...\n```)
  const cleanText = interaction.output_text.replace(/```json|```/g, '').trim();

  const result = JSON.parse(cleanText);
  result.model = 'gemini-3.8-flash';
  return result;
}

/**
 * Rule-based analysis (fallback when no AI API configured)
 */
function analyzeWithRules(text) {
  const lower = text.toLowerCase();
  let detectedSeverity = 'L1';
  let detectedCategory = 'GENERAL';
  let detectedUrgency = 'LOW';
  let confidence = 0.6;
  let explanation = 'Classified by rule-based engine';
  const threatIndicators = [];
  const recommendedRecipients = [];

  // Check severity levels from highest to lowest
  for (const [level, rules] of Object.entries(SEVERITY_RULES)) {
    for (const keyword of rules.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        detectedSeverity = level;
        detectedUrgency = rules.urgency;
        confidence = level === 'L4' ? 0.85 : level === 'L3' ? 0.75 : 0.65;
        threatIndicators.push(keyword);
        break;
      }
    }
    if (detectedSeverity !== 'L1' || level === 'L1') break;
  }

  // Detect specific category
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        detectedCategory = category;
        break;
      }
    }
    if (detectedCategory !== 'GENERAL') break;
  }

  // Determine recommended recipients based on severity
  switch (detectedSeverity) {
    case 'L4':
      recommendedRecipients.push('SECURITY', 'PRINCIPAL', 'SUPER_ADMIN');
      explanation = 'Critical safety indicators detected. Immediate response required.';
      break;
    case 'L3':
      recommendedRecipients.push('SECURITY', 'HOD', 'WOMENS_CELL');
      explanation = 'High severity safety indicators detected. Prompt response needed.';
      break;
    case 'L2':
      recommendedRecipients.push('HOD', 'COUNSELOR', 'WOMENS_CELL');
      explanation = 'Moderate severity indicators detected. Follow-up required.';
      break;
    default:
      recommendedRecipients.push('MENTOR', 'COUNSELOR');
      explanation = 'Low severity issue. Standard handling appropriate.';
  }

  // Boost for women's safety keywords
  const womenSafetyKeywords = ['woman', 'girl', 'female', 'stalking', 'following', 'sexual', 'grope', 'molest', 'touch'];
  if (womenSafetyKeywords.some(k => lower.includes(k))) {
    if (!recommendedRecipients.includes('WOMENS_CELL')) {
      recommendedRecipients.push('WOMENS_CELL');
    }
  }

  return {
    category: detectedCategory,
    severity: detectedSeverity,
    urgency: detectedUrgency,
    confidence,
    explanation,
    recommended_recipients: recommendedRecipients,
    threat_indicators: threatIndicators,
    requires_human_review: confidence < 0.7,
    model: 'rule-engine-v1'
  };
}

module.exports = { analyzeComplaint };
