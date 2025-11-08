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

    const userPrompt = `Generate THREE thoughtful date night ideas based on these preferences:
- Available Time: ${prefs.time}
- Location Preference: ${prefs.location}
- Budget: ${prefs.price}
- Who's Participating: ${prefs.participants}
- Energy Level: ${prefs.energy}

IMPORTANT: Format each idea EXACTLY as follows, separated by the ✨ symbol:

✨ [Creative Date Title]
Description: [2-3 sentences describing the activity and why it strengthens connection]
Connection Tip: [Specific conversation starter or tip based on Gottman/EFT research]

Example format:
✨ Gottman Love Maps Game Night
Description: Create a cozy atmosphere at home and take turns asking each other deep questions from the Gottman Love Maps card deck. This activity builds friendship and intimacy by helping you learn new things about each other, even after years together. Based on Gottman research, couples who know each other's inner worlds have stronger relationships.
Connection Tip: Start with lighter questions like favorite memories together, then gradually move to deeper topics like dreams and fears. Use the "I appreciate when you..." format to express gratitude during the conversation.

Now generate THREE unique date night ideas in this exact format.`;

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

---

## 🎯 Edge Function #2: ai-insights

### File: `supabase/functions/ai-insights/index.ts`

This edge function analyzes weekly check-in data using Perplexity AI to generate clinical insights for therapists.

**Features:**
- ✅ **Secure Authentication**: Requires valid JWT, derives therapist_id from session (prevents access-control bypass)
- ✅ **Privacy-focused**: Uses "Partner 1" and "Partner 2" labels (no real names sent to AI)
- ✅ **Authorization**: Validates therapist access to couple data, rejects non-therapists
- ✅ **Structured Insights**: Returns summary, discrepancies, patterns, recommendations
- ✅ **Single-file deployment**: All code inlined (no shared imports)

**Copy this entire file** to your Supabase project:

```typescript
// ========================================
// Supabase Edge Function: AI Insights
// ========================================
// Analyzes weekly check-in data using Perplexity AI to generate clinical insights for therapists
// 
// PRIVACY APPROACH:
// - Uses anonymized labels ("Partner 1", "Partner 2") when sending data to Perplexity AI
// - Never sends actual user names to external AI service
// - Allowlist logging approach: only logs field presence/counts, never actual user data
//
// ARCHITECTURE:
// - All code inlined in single file (no shared imports for simpler deployment)
// - Uses fetch() for Perplexity API calls
// - Validates therapist access before analyzing data
// - Returns structured insights (summary, discrepancies, patterns, recommendations)

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
interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  temperature: number;
  max_tokens?: number;
}

interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations?: string[];
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface WeeklyCheckIn {
  id: string;
  couple_id: string;
  user_id: string;
  year: number;
  week_number: number;
  q_connectedness: number;
  q_conflict: number;
  q_appreciation: string;
  q_regrettable_incident: string;
  q_my_need: string;
  created_at: string;
}

interface Couple {
  id: string;
  partner1_id: string;
  partner2_id: string;
  therapist_id: string | null;
}

interface AIInsightResponse {
  couple_id: string;
  generated_at: string;
  summary: string;
  discrepancies: string[];
  patterns: string[];
  recommendations: string[];
  raw_analysis: string;
  citations?: string[];
}

// ========================================
// Privacy-Focused Logging Helper
// ========================================
function redactForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return '[redacted]';
  }

  const redacted: any = {};
  
  // Allowlist approach: only log safe metadata
  const safeFields = ['couple_id', 'therapist_id', 'timestamp'];
  
  for (const key of safeFields) {
    if (key in data) {
      redacted[key] = data[key];
    }
  }
  
  // Log counts instead of actual data
  if ('checkins' in data && Array.isArray(data.checkins)) {
    redacted.checkins_count = data.checkins.length;
  }
  
  return redacted;
}

// ========================================
// Perplexity AI Helper (Inlined)
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
    temperature: 0.2,
    max_tokens: 1500,
  };

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
  }

  const data: PerplexityResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('Perplexity API returned no choices');
  }

  return {
    content: data.choices[0].message.content,
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
    // Parse query parameters
    const url = new URL(req.url);
    const coupleId = url.searchParams.get('couple_id');

    if (!coupleId) {
      console.error('Missing required parameter: couple_id');
      return new Response(
        JSON.stringify({ error: 'couple_id is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    // SECURITY: Validate JWT and extract therapist_id from authenticated session
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');

    // Verify JWT and get user session using anon key
    const sessionResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${jwt}`,
        },
      }
    );

    if (!sessionResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const user = await sessionResponse.json();
    
    if (!user || !user.id) {
      return new Response(
        JSON.stringify({ error: 'Unable to authenticate user' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Get therapist profile for authenticated user
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/Couples_profiles?id=eq.${user.id}&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }

    const profiles = await profileResponse.json();
    const profile = profiles[0];

    if (!profile || profile.user_type !== 'therapist') {
      return new Response(
        JSON.stringify({ error: 'Access denied. Only therapists can access insights.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    const therapistId = profile.id;
    console.log('Generating AI insights for:', redactForLogging({ couple_id: coupleId, therapist_id: therapistId }));

    // 1. Validate therapist has access to this couple
    const coupleResponse = await fetch(
      `${supabaseUrl}/rest/v1/Couples_couples?id=eq.${coupleId}&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!coupleResponse.ok) {
      throw new Error('Failed to fetch couple data');
    }

    const couples: Couple[] = await coupleResponse.json();
    const couple = couples[0];

    if (!couple) {
      return new Response(
        JSON.stringify({ error: 'Couple not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    if (couple.therapist_id !== therapistId) {
      return new Response(
        JSON.stringify({ error: "You don't have access to this couple's data" }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // 2. Fetch last 12 weeks of check-ins
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const checkinsResponse = await fetch(
      `${supabaseUrl}/rest/v1/Couples_weekly_checkins?couple_id=eq.${coupleId}&created_at=gte.${twelveWeeksAgo.toISOString()}&order=year.asc,week_number.asc&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!checkinsResponse.ok) {
      throw new Error('Failed to fetch check-ins');
    }

    const checkins: WeeklyCheckIn[] = await checkinsResponse.json();

    if (!checkins || checkins.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No check-in data available for this couple in the last 12 weeks' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log('Fetched check-ins:', redactForLogging({ checkins }));

    // 3. Format data for Perplexity AI analysis
    // PRIVACY: Use anonymized labels instead of actual names
    const weeklyData: Record<string, any[]> = {};
    
    checkins.forEach(checkin => {
      const weekKey = `${checkin.year}-W${checkin.week_number}`;
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = [];
      }
      const partnerId = checkin.user_id === couple.partner1_id ? 1 : 2;
      weeklyData[weekKey].push({
        partnerId,
        partnerLabel: `Partner ${partnerId}`, // Anonymized - no real names
        connectedness: checkin.q_connectedness,
        conflict: checkin.q_conflict,
        appreciation: checkin.q_appreciation,
        regrettableIncident: checkin.q_regrettable_incident,
        need: checkin.q_my_need,
        createdAt: checkin.created_at,
      });
    });

    // Build user prompt
    let userPrompt = `Analyze the following weekly check-in data for a couple in therapy:\n\n`;
    
    const sortedWeeks = Object.keys(weeklyData).sort();
    sortedWeeks.forEach(weekKey => {
      const weekCheckins = weeklyData[weekKey];
      const [year, weekNum] = weekKey.split('-W');
      const sampleDate = weekCheckins[0]?.createdAt ? 
        new Date(weekCheckins[0].createdAt).toLocaleDateString() : '';

      userPrompt += `Week ${weekNum}, ${year} (${sampleDate}):\n`;

      weekCheckins.forEach(checkin => {
        userPrompt += `- ${checkin.partnerLabel}: Connectedness: ${checkin.connectedness}/10, Conflict: ${checkin.conflict}/10\n`;
        userPrompt += `  Appreciation: "${checkin.appreciation}"\n`;
        userPrompt += `  Regrettable Incident: "${checkin.regrettableIncident}"\n`;
        userPrompt += `  Need: "${checkin.need}"\n`;
      });

      userPrompt += '\n';
    });

    userPrompt += `\nBased on this data, provide:\n`;
    userPrompt += `1. A brief summary of the couple's relationship dynamics\n`;
    userPrompt += `2. Key discrepancies between partners' perceptions (list 3-5 specific points)\n`;
    userPrompt += `3. Important patterns and trends over time (list 3-5 specific observations)\n`;
    userPrompt += `4. Therapeutic recommendations for the therapist (list 3-5 actionable items)\n`;

    const systemPrompt = `You are an expert couples therapist analyzing weekly check-in data from a therapeutic intervention. Analyze the provided data to identify:
1. Significant discrepancies between partners' perceptions (connectedness and conflict scores)
2. Temporal patterns and trends
3. Areas of concern requiring therapeutic attention
4. Potential relationship strengths to build upon
5. Specific recommendations for the therapist

Be precise, evidence-based, and therapeutically sensitive. Format your response as structured insights.`;

    // 4. Call Perplexity API
    const analysisResult = await analyzeWithPerplexity(systemPrompt, userPrompt);

    // 5. Parse and structure the response
    const rawAnalysis = analysisResult.content;
    
    const lines = rawAnalysis.split('\n').filter(line => line.trim());
    
    let summary = '';
    const discrepancies: string[] = [];
    const patterns: string[] = [];
    const recommendations: string[] = [];
    
    let currentSection = '';
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('summary') || lowerLine.includes('dynamic')) {
        currentSection = 'summary';
      } else if (lowerLine.includes('discrepanc')) {
        currentSection = 'discrepancies';
      } else if (lowerLine.includes('pattern') || lowerLine.includes('trend')) {
        currentSection = 'patterns';
      } else if (lowerLine.includes('recommendation') || lowerLine.includes('therapeutic')) {
        currentSection = 'recommendations';
      } else if (line.trim().match(/^[\d\-\*•]/)) {
        // This is a list item
        const cleanedLine = line.trim().replace(/^[\d\-\*•.)\s]+/, '');
        if (currentSection === 'discrepancies') {
          discrepancies.push(cleanedLine);
        } else if (currentSection === 'patterns') {
          patterns.push(cleanedLine);
        } else if (currentSection === 'recommendations') {
          recommendations.push(cleanedLine);
        }
      } else if (currentSection === 'summary' && line.trim()) {
        summary += line.trim() + ' ';
      }
    });

    // Fallback if parsing didn't work well
    if (!summary) {
      summary = rawAnalysis.substring(0, 300) + '...';
    }
    if (discrepancies.length === 0) {
      discrepancies.push('Analysis completed - see raw analysis for details');
    }
    if (patterns.length === 0) {
      patterns.push('Analysis completed - see raw analysis for details');
    }
    if (recommendations.length === 0) {
      recommendations.push('Analysis completed - see raw analysis for details');
    }

    const insights: AIInsightResponse = {
      couple_id: coupleId,
      generated_at: new Date().toISOString(),
      summary: summary.trim(),
      discrepancies,
      patterns,
      recommendations,
      raw_analysis: rawAnalysis,
      citations: analysisResult.citations,
    };

    console.log('Successfully generated insights for couple:', redactForLogging({ couple_id: coupleId }));

    return new Response(
      JSON.stringify(insights),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error generating AI insights:', errorMessage);
    
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
```bash
supabase functions deploy ai-date-night
```

3. **Deploy ai-insights**:
```bash
supabase functions deploy ai-insights
```

4. **View logs**:
```bash
# ai-date-night logs
supabase functions logs ai-date-night --follow

# ai-insights logs  
supabase functions logs ai-insights --follow
```

---

## 🧪 Testing

### Test ai-date-night
```bash
curl -i --location --request POST 'https://your-project-ref.supabase.co/functions/v1/ai-date-night' \
  --header 'Content-Type: application/json' \
  --data '{"time":"Full evening","location":"At home","price":"Budget-friendly","participants":"Adults only","energy":"Low-key and relaxing"}'
```

### Test ai-insights
**Note:** ai-insights requires therapist authentication. Use a valid therapist JWT token:

```bash
# Get therapist JWT from Supabase Auth, then:
curl -i --location --request GET 'https://your-project-ref.supabase.co/functions/v1/ai-insights?couple_id=YOUR_COUPLE_ID' \
  --header 'Authorization: Bearer YOUR_THERAPIST_JWT_TOKEN'
```

---

## 📝 Migration Summary

**Status:** ✅ All AI endpoints migrated to Supabase Edge Functions

| Endpoint | Status | Description |
|----------|--------|-------------|
| `ai-date-night` | ✅ Migrated | Generates personalized date night ideas |
| `ai-insights` | ✅ Migrated | Analyzes check-ins for clinical insights |
| `ai-analytics` | ℹ️ No migration needed | Pure database aggregation (no AI) |

**Benefits:**
- 🌍 Global edge deployment (lower latency)
- 💰 Pay-per-invocation pricing
- 🚀 Simpler Vercel deployment (no Express server needed)
- 🔒 Privacy-focused with allowlist logging
- 📦 All code inlined (no shared imports to manage)

