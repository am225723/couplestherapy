// ========================================
// CORS Headers
// ========================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========================================
// Type Definitions
// ========================================
interface DateNightPreferences {
  time: string;
  location: string;
  price: string;
  participants: string;
  energy: string;
}

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
}

// ========================================
// Validation Functions
// ========================================
function validateDateNightPreferences(data: any): { 
  valid: boolean; 
  data?: DateNightPreferences; 
  error?: string;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const requiredFields = ['time', 'location', 'price', 'participants', 'energy'];
  
  // Check for missing or invalid fields
  const missingFields = requiredFields.filter(field => !data[field] || typeof data[field] !== 'string');
  if (missingFields.length > 0) {
    return { 
      valid: false, 
      error: `Missing or invalid required fields: ${missingFields.join(', ')}` 
    };
  }

  // Trim all fields and validate they're not empty
  const trimmedData = {
    time: data.time.trim(),
    location: data.location.trim(),
    price: data.price.trim(),
    participants: data.participants.trim(),
    energy: data.energy.trim(),
  };

  // Check for empty fields after trimming
  const emptyFields = Object.entries(trimmedData)
    .filter(([_, value]) => value.length === 0)
    .map(([key, _]) => key);

  if (emptyFields.length > 0) {
    return { 
      valid: false, 
      error: `Fields cannot be empty: ${emptyFields.join(', ')}` 
    };
  }

  // Max length validation to prevent abuse
  const maxLength = 500;
  const tooLongFields = Object.entries(trimmedData)
    .filter(([_, value]) => value.length > maxLength)
    .map(([key, _]) => key);

  if (tooLongFields.length > 0) {
    return { 
      valid: false, 
      error: `Fields exceed maximum length of ${maxLength} characters: ${tooLongFields.join(', ')}` 
    };
  }

  return {
    valid: true,
    data: trimmedData,
  };
}

function redactForLogging(data: any): string {
  // Redact ALL user inputs for production logging
  // This prevents accidentally logging extra fields that may contain sensitive data
  if (!data || typeof data !== 'object') {
    return '[invalid data]';
  }

  // Only log field presence, never actual values
  // Use an allowlist approach - only log known safe metadata
  const knownFields = ['time', 'location', 'price', 'participants', 'energy'];
  const redacted: Record<string, string> = {};

  for (const field of knownFields) {
    if (field in data) {
      redacted[field] = '[REDACTED]';
    }
  }

  // Count any extra fields without logging their names or values
  const extraFieldCount = Object.keys(data).filter(key => !knownFields.includes(key)).length;
  if (extraFieldCount > 0) {
    redacted['_extra_fields'] = `[${extraFieldCount} fields redacted]`;
  }

  return JSON.stringify(redacted);
}

// ========================================
// Perplexity API Integration
// ========================================
async function analyzeWithPerplexity(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; citations?: string[] }> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY');

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const requestBody: PerplexityRequest = {
    model: 'sonar',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  };

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
  }

  const data: PerplexityResponse = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    citations: data.citations,
  };
}

// ========================================
// Main Edge Function Handler
// ========================================
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    
    // Validate input with proper error messages
    const validation = validateDateNightPreferences(rawBody);
    if (!validation.valid) {
      console.error('Validation failed:', redactForLogging(rawBody));
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    const prefs = validation.data!;
    console.log('Generating date night ideas with preferences:', redactForLogging(prefs));

    const systemPrompt = `You are a compassionate relationship expert and certified couples therapist specializing in Gottman Method, Emotionally Focused Therapy (EFT), and attachment theory. Your role is to suggest creative, evidence-based date night activities that foster emotional connection, communication, and intimacy between partners.

Guidelines:
- Prioritize emotional connection over entertainment
- Incorporate elements that encourage conversation and vulnerability
- Reference research from the Gottman Institute, Sue Johnson (EFT), and other relationship experts
- Suggest activities that build friendship, manage conflict, and create shared meaning
- Include practical tips and conversation starters
- Be inclusive of diverse relationship styles and needs`;

    const userPrompt = `Generate a thoughtful date night idea based on these preferences:
- Available Time: ${prefs.time}
- Location Preference: ${prefs.location}
- Budget: ${prefs.price}
- Who's Participating: ${prefs.participants}
- Energy Level: ${prefs.energy}

Please provide:
1. A creative date night activity title
2. Detailed description of the activity
3. Why this activity strengthens emotional connection (reference research)
4. Specific conversation starters or prompts
5. Tips to make it more meaningful`;

    const result = await analyzeWithPerplexity(systemPrompt, userPrompt);

    return new Response(
      JSON.stringify({
        content: result.content,
        citations: result.citations,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    // Don't log full error details in production to avoid leaking user data
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error generating date night ideas:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
