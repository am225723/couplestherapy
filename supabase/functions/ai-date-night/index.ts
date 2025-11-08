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
- Base suggestions on research-backed relationship principles
- Tailor activities to the couple's constraints (time, budget, location, energy level)
- Emphasize quality time, active listening, and shared experiences
- Include clear instructions for each activity
- Highlight how each activity strengthens specific relationship skills (e.g., trust, communication, fun)
- Be warm, encouraging, and non-judgmental

Format your response as exactly 3 distinct date night ideas with the following structure:
**Idea [number]: [Catchy Title]**
**What to do:** [Step-by-step instructions]
**Why it works:** [Explain the relationship benefits and therapeutic value]
**Connection tip:** [One specific conversation starter or mindfulness exercise to deepen the experience]
`;

    const userPrompt = `Please suggest 3 personalized date night ideas based on these preferences:
- Time available: ${prefs.time}
- Location preference: ${prefs.location}
- Budget: ${prefs.price}
- Participants: ${prefs.participants}
- Energy level: ${prefs.energy}

Remember to provide exactly 3 ideas with the specified format.`;

    const result = await analyzeCheckInsWithPerplexity({
      systemPrompt,
      userPrompt,
    });

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
