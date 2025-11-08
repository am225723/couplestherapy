# Complete Supabase Edge Functions Code (No Shared Imports)

This document contains the complete edge function code with all utilities inlined. Simply copy the single file to Supabase - no shared imports needed!

---

## 🎯 Edge Function: ai-date-night

### File: `supabase/functions/ai-date-night/index.ts`

Copy this entire file to your Supabase project at `supabase/functions/ai-date-night/index.ts`:

```typescript
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
```

---

## 🚀 Deployment Instructions

### 1. Add to Supabase

**Option A: Using Supabase CLI**

```bash
# Create the function directory
mkdir -p supabase/functions/ai-date-night

# Copy the code above into:
# supabase/functions/ai-date-night/index.ts

# Deploy
supabase functions deploy ai-date-night
```

**Option B: Using Supabase Dashboard**

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click **"Create a new function"**
4. Name it `ai-date-night`
5. Paste the entire code from above
6. Click **Deploy**

---

### 2. Set Environment Variables

```bash
# Set the Perplexity API key
supabase secrets set PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxx

# Verify it's set
supabase secrets list
```

**Note:** These are automatically provided by Supabase (no need to set):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

### 3. Test the Function

**View Logs:**
```bash
supabase functions logs ai-date-night --follow
```

**Test with curl:**
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-date-night' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "time": "2-3 hours",
    "location": "At home",
    "price": "Free or low-cost",
    "participants": "Just us two",
    "energy": "Relaxed and low-key"
  }'
```

---

## 📋 What This Code Does

### ✅ Features

1. **CORS Support** - Allows frontend to call from any domain
2. **Input Validation** - Validates all required fields, rejects empty/too long inputs
3. **Privacy Protection** - Logs never contain actual user data (only field presence)
4. **Error Handling** - Returns proper HTTP status codes:
   - `400` for bad input (validation errors)
   - `500` for server errors
5. **Perplexity Integration** - Generates AI-powered date night suggestions
6. **Type Safety** - TypeScript interfaces for all data structures

### 🔒 Security

- **No Data Leakage**: Logging uses allowlist approach, never logs user values
- **Input Sanitization**: Trims whitespace, validates length (max 500 chars), rejects malformed data
- **Safe Error Messages**: Error responses don't expose sensitive information
- **Extra Field Protection**: Unknown fields are counted but never logged

---

## 🧪 Testing Checklist

- [ ] Deploy function to Supabase
- [ ] Set `PERPLEXITY_API_KEY` secret
- [ ] Test with valid input
- [ ] Test with invalid input (missing fields)
- [ ] Test with empty strings
- [ ] Test with too-long input (>500 chars)
- [ ] Verify logs don't contain user data
- [ ] Test from frontend with `supabase.functions.invoke()`

---

## 📊 Example Request/Response

**Request:**
```json
{
  "time": "2-3 hours",
  "location": "At home",
  "price": "Free or low-cost",
  "participants": "Just us two",
  "energy": "Relaxed and low-key"
}
```

**Success Response (200):**
```json
{
  "content": "# Cozy Connection Evening\n\n[AI-generated date night suggestion with research-backed relationship advice]",
  "citations": ["https://www.gottman.com/...", "https://iceeft.com/..."]
}
```

**Validation Error (400):**
```json
{
  "error": "Missing or invalid required fields: time, location"
}
```

**Server Error (500):**
```json
{
  "error": "PERPLEXITY_API_KEY not configured"
}
```

---

## 📁 Directory Structure

```
supabase/
└── functions/
    └── ai-date-night/
        └── index.ts    ← Copy the code here
```

**That's it!** No shared imports, no additional files needed. Everything is self-contained in one file.

---

## 🎉 You're Done!

The edge function is ready to deploy. It includes:
- ✅ All utilities inlined (no shared imports)
- ✅ CORS support built-in
- ✅ Privacy-focused logging
- ✅ Comprehensive input validation
- ✅ Perplexity AI integration
- ✅ Production-ready error handling

**Deploy it now:**
```bash
supabase functions deploy ai-date-night
```

Then test from your frontend:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const response = await fetch(
  `${supabaseUrl}/functions/v1/ai-date-night`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      time: "2-3 hours",
      location: "At home",
      price: "Free or low-cost",
      participants: "Just us two",
      energy: "Relaxed and low-key"
    }),
  }
);

const data = await response.json();
```
