# Supabase Edge Functions - Ready for Deployment

## Edge Function 1: AI Date Night (Connection Concierge)

**Path:** `supabase/functions/ai-date-night/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const PERPLEXITY_API_KEY = "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"

// Allowlist for logging - only log these specific fields
const ALLOWLIST_FIELDS = ['status', 'model', 'duration_ms', 'prompt_length', 'response_length']

function logSafe(message: string, data?: any) {
  if (!data) {
    console.log(message)
    return
  }
  
  const safeData = {}
  for (const key of ALLOWLIST_FIELDS) {
    if (data[key] !== undefined) {
      safeData[key] = data[key]
    }
  }
  console.log(message, safeData)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { preferences, location, budget } = await req.json()
    
    const prompt = `You are a creative couples therapist and relationship coach. Generate 3 unique, thoughtful date night ideas based on these preferences:
    
    Preferences: ${preferences || 'Open to anything'}
    Location: ${location || 'Local area'}
    Budget: ${budget || 'Flexible'}
    
    For each date idea, provide:
    1. A catchy name/title
    2. Detailed description (2-3 sentences)
    3. Why it's good for couples (relationship benefit)
    4. Estimated cost and duration
    
    Format as JSON array with this structure:
    [
      {
        "title": "Date Name",
        "description": "What you'll do...",
        "benefit": "Why it helps your relationship...",
        "cost": "$$ estimate",
        "duration": "X hours"
      }
    ]
    
    Be creative, specific, and romantic. Focus on connection and intimacy.`

    logSafe('Calling Perplexity API', {
      prompt_length: prompt.length,
      model: 'sonar'
    })

    const startTime = Date.now()
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a creative couples therapist. Always respond with valid JSON arrays.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    const duration_ms = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      logSafe('Perplexity API error', {
        status: response.status,
        duration_ms
      })
      throw new Error(`Perplexity API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '[]'
    
    logSafe('Perplexity API success', {
      status: 200,
      duration_ms,
      response_length: content.length
    })

    // Parse JSON from the response
    let dateIdeas
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        dateIdeas = JSON.parse(jsonMatch[0])
      } else {
        dateIdeas = JSON.parse(content)
      }
    } catch (e) {
      logSafe('JSON parse error - using fallback')
      dateIdeas = [
        {
          title: "Sunset Picnic & Stargazing",
          description: "Pack a cozy blanket, your favorite snacks, and head to a scenic spot to watch the sunset together. Stay for stargazing and meaningful conversation.",
          benefit: "Slowing down together in nature creates space for vulnerability and connection without daily distractions.",
          cost: "$20-40",
          duration: "2-3 hours"
        },
        {
          title: "Cook a New Recipe Together",
          description: "Choose a cuisine you've never tried making at home, shop for ingredients together, and cook side-by-side while sipping wine and talking.",
          benefit: "Collaboration in the kitchen builds teamwork, creates shared memories, and the sensory experience enhances intimacy.",
          cost: "$30-50",
          duration: "2-3 hours"
        },
        {
          title: "Memory Lane Date",
          description: "Recreate your first date or visit meaningful places from your relationship journey. Take photos and share what you remember from those moments.",
          benefit: "Reflecting on your history together reinforces your bond and reminds you why you fell in love.",
          cost: "$40-80",
          duration: "3-4 hours"
        }
      ]
    }

    return new Response(
      JSON.stringify({ dateIdeas, citations: data.citations || [] }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  } catch (error) {
    logSafe('Edge function error', {
      status: 500
    })
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  }
})
```

---

## Edge Function 2: AI Insights (Clinical Insights for Therapists)

**Path:** `supabase/functions/ai-insights/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PERPLEXITY_API_KEY = "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"

// Allowlist for logging
const ALLOWLIST_FIELDS = ['status', 'model', 'duration_ms', 'checkin_count', 'couple_id']

function logSafe(message: string, data?: any) {
  if (!data) {
    console.log(message)
    return
  }
  
  const safeData = {}
  for (const key of ALLOWLIST_FIELDS) {
    if (data[key] !== undefined) {
      safeData[key] = data[key]
    }
  }
  console.log(message, safeData)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { couple_id } = await req.json()
    
    if (!couple_id) {
      return new Response(
        JSON.stringify({ error: 'couple_id is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    logSafe('Fetching couple data', { couple_id })

    // Fetch couple info
    const { data: couple } = await supabaseClient
      .from('Couples_couples')
      .select('partner1_id, partner2_id')
      .eq('id', couple_id)
      .single()

    if (!couple) {
      return new Response(
        JSON.stringify({ error: 'Couple not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch partner names
    const { data: profiles } = await supabaseClient
      .from('Couples_profiles')
      .select('id, full_name')
      .in('id', [couple.partner1_id, couple.partner2_id])

    const partner1Name = profiles?.find(p => p.id === couple.partner1_id)?.full_name || 'Partner 1'
    const partner2Name = profiles?.find(p => p.id === couple.partner2_id)?.full_name || 'Partner 2'

    // Fetch last 8 weeks of check-ins
    const { data: checkins } = await supabaseClient
      .from('Couples_weekly_checkins')
      .select('*')
      .eq('couple_id', couple_id)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(16)

    if (!checkins || checkins.length === 0) {
      return new Response(
        JSON.stringify({ 
          summary: 'Not enough data yet. Couples need to complete more weekly check-ins.',
          discrepancies: [],
          patterns: [],
          recommendations: []
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      )
    }

    logSafe('Building anonymized prompt', {
      couple_id,
      checkin_count: checkins.length
    })

    // Build anonymized dataset for AI
    const anonymizedData = checkins.map(c => ({
      week: `Week ${c.week_number}, ${c.year}`,
      partner1: {
        connectedness: c.connectedness_rating_1,
        conflict: c.conflict_rating_1,
        physical_intimacy: c.physical_intimacy_1,
        emotional_intimacy: c.emotional_intimacy_1,
        quality_time: c.quality_time_1,
        highlight: c.highlight_1 ? '[REDACTED]' : null,
        challenge: c.challenge_1 ? '[REDACTED]' : null,
        gratitude: c.gratitude_1 ? '[REDACTED]' : null
      },
      partner2: {
        connectedness: c.connectedness_rating_2,
        conflict: c.conflict_rating_2,
        physical_intimacy: c.physical_intimacy_2,
        emotional_intimacy: c.emotional_intimacy_2,
        quality_time: c.quality_time_2,
        highlight: c.highlight_2 ? '[REDACTED]' : null,
        challenge: c.challenge_2 ? '[REDACTED]' : null,
        gratitude: c.gratitude_2 ? '[REDACTED]' : null
      }
    }))

    const prompt = `You are an experienced couples therapist analyzing weekly check-in data. Review this anonymized data and provide clinical insights:

${JSON.stringify(anonymizedData, null, 2)}

Provide:
1. Summary (2-3 sentences): Overall relationship health trajectory
2. Discrepancies (array): Where partners' perceptions differ significantly
3. Patterns (array): Recurring trends in ratings or timing
4. Recommendations (array): 3-5 specific therapeutic interventions

Format as JSON:
{
  "summary": "...",
  "discrepancies": ["Discrepancy 1", "Discrepancy 2"],
  "patterns": ["Pattern 1", "Pattern 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}

Use "Partner 1" and "Partner 2" - never use real names.`

    const startTime = Date.now()

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a licensed couples therapist. Respond only with valid JSON. Never include real names.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    const duration_ms = Date.now() - startTime

    if (!response.ok) {
      logSafe('Perplexity API error', {
        status: response.status,
        duration_ms
      })
      throw new Error(`Perplexity API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || '{}'

    logSafe('Perplexity API success', {
      status: 200,
      duration_ms
    })

    // Parse JSON
    let insights
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0])
      } else {
        insights = JSON.parse(content)
      }
    } catch (e) {
      insights = {
        summary: 'Unable to generate insights at this time.',
        discrepancies: [],
        patterns: [],
        recommendations: []
      }
    }

    return new Response(
      JSON.stringify({
        couple_id,
        generated_at: new Date().toISOString(),
        ...insights,
        raw_analysis: content,
        citations: data.citations || []
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  } catch (error) {
    logSafe('Edge function error', {
      status: 500
    })
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  }
})
```

---

## Deployment Instructions

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Link to your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Set secrets:**
   ```bash
   supabase secrets set PERPLEXITY_API_KEY=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
   ```

4. **Deploy functions:**
   ```bash
   supabase functions deploy ai-date-night
   supabase functions deploy ai-insights
   ```

5. **Get function URLs:**
   - Format: `https://[project-ref].supabase.co/functions/v1/[function-name]`
   - Use these URLs in your frontend to call the functions

## Frontend Integration

Both functions are already integrated in the frontend:
- `client/src/pages/date-night.tsx` calls `ai-date-night`
- `client/src/pages/analytics.tsx` calls `ai-insights`

The functions are designed to work with or without authentication for maximum flexibility.
