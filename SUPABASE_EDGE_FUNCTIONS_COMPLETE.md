# Complete Supabase Edge Functions Code

This document contains ALL code needed to add the edge functions to your Supabase project. Simply copy each file to the corresponding location in your Supabase project.

---

## 📁 Directory Structure

```
supabase/
└── functions/
    ├── _shared/
    │   ├── cors.ts
    │   ├── perplexity.ts
    │   ├── supabase-client.ts
    │   └── validation.ts
    └── ai-date-night/
        └── index.ts
```

---

## 🔧 Shared Utilities

### File: `supabase/functions/_shared/cors.ts`

```typescript
// CORS headers for edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

### File: `supabase/functions/_shared/supabase-client.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const getSupabaseClient = (authHeader?: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  if (authHeader) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};

export const getSupabaseServiceClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceKey);
};
```

---

### File: `supabase/functions/_shared/perplexity.ts`

```typescript
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

export async function analyzeCheckInsWithPerplexity(
  systemPrompt: string,
  userPrompt: string
): Promise<{ content: string; citations?: string[] }> {
  const apiKey = Deno.env.get('PERPLEXITY_API_KEY');

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const requestBody: PerplexityRequest = {
    model: 'llama-3.1-sonar-large-128k-online',
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
```

---

### File: `supabase/functions/_shared/validation.ts`

```typescript
// Simple validation helpers for edge functions
// Using manual validation instead of Zod since Zod has Deno compatibility issues

export interface DateNightPreferences {
  time: string;
  location: string;
  price: string;
  participants: string;
  energy: string;
}

export function validateDateNightPreferences(data: any): { 
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

  // Optional: Add max length validation to prevent abuse
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

export function redactForLogging(data: any): string {
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
```

---

## 🎯 Edge Function: ai-date-night

### File: `supabase/functions/ai-date-night/index.ts`

```typescript
import { corsHeaders } from '../_shared/cors.ts';
import { analyzeCheckInsWithPerplexity } from '../_shared/perplexity.ts';
import { validateDateNightPreferences, redactForLogging } from '../_shared/validation.ts';

Deno.serve(async (req) => {
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

    const result = await analyzeCheckInsWithPerplexity(systemPrompt, userPrompt);

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

### 1. Create the Files in Supabase

You can add these files directly through the Supabase Dashboard or using the CLI:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to your project
cd your-project-directory

# Create the directory structure
mkdir -p supabase/functions/_shared
mkdir -p supabase/functions/ai-date-night

# Copy each file from this document to the corresponding location
# Then deploy:
supabase functions deploy ai-date-night
```

#### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click **"Create a new function"**
4. Name it `ai-date-night`
5. Copy the code from `ai-date-night/index.ts` above
6. Create the `_shared` folder and add each utility file

---

### 2. Set Environment Variables

```bash
# Set the Perplexity API key
supabase secrets set PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxx

# These are automatically provided by Supabase:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

---

### 3. Test the Function

```bash
# View logs
supabase functions logs ai-date-night --follow

# Test with curl
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

## 📝 Environment File Template

### File: `supabase/.env.example`

```bash
# Supabase Edge Functions Environment Variables
# Copy this file to .env.local for local development

# Perplexity AI API Key
# Get your API key from: https://www.perplexity.ai/settings/api
PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxx

# These are automatically provided by Supabase:
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## ✅ What This Does

- **CORS Support**: Allows frontend to call the function from any domain
- **Input Validation**: Validates all required fields, rejects empty/too long inputs
- **Privacy Protection**: Logs never contain actual user data (only field presence)
- **Error Handling**: Returns proper HTTP status codes (400 for bad input, 500 for server errors)
- **Perplexity Integration**: Generates AI-powered date night suggestions
- **Type Safety**: TypeScript interfaces for all data structures

---

## 🔒 Security Features

1. **No Data Leakage**: Logging uses allowlist approach, never logs user values
2. **Input Sanitization**: Trims whitespace, validates length, rejects malformed data
3. **Safe Error Messages**: Error responses don't expose sensitive information
4. **Extra Field Protection**: Unknown fields are counted but never logged

---

## 📊 Testing Checklist

- [ ] Deploy function to Supabase
- [ ] Set PERPLEXITY_API_KEY secret
- [ ] Test with valid input
- [ ] Test with invalid input (missing fields)
- [ ] Test with empty strings
- [ ] Test with too-long input (>500 chars)
- [ ] Verify logs don't contain user data
- [ ] Test from frontend with `supabase.functions.invoke()`

---

## 🎉 You're Done!

All code is ready to copy directly into your Supabase project. The edge function will:
- ✅ Run globally on Supabase's edge network
- ✅ Scale automatically with demand
- ✅ Protect user privacy with redacted logging
- ✅ Validate all inputs before processing
- ✅ Return clear error messages

**Next Steps:**
1. Copy all files to your Supabase project
2. Set the PERPLEXITY_API_KEY secret
3. Deploy with `supabase functions deploy ai-date-night`
4. Test and celebrate! 🎊
