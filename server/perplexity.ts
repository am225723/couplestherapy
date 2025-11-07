interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityRequest {
  model: string;
  messages: PerplexityMessage[];
  temperature: number;
  stream: boolean;
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

export interface AnalyzeCheckInsParams {
  systemPrompt: string;
  userPrompt: string;
}

export interface AnalyzeCheckInsResult {
  content: string;
  citations?: string[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Calls Perplexity AI API to analyze check-in data
 */
export async function analyzeCheckInsWithPerplexity(
  params: AnalyzeCheckInsParams
): Promise<AnalyzeCheckInsResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY environment variable is not set');
  }

  const request: PerplexityRequest = {
    model: 'sonar-pro',
    messages: [
      {
        role: 'system',
        content: params.systemPrompt,
      },
      {
        role: 'user',
        content: params.userPrompt,
      },
    ],
    temperature: 0.2,
    stream: false,
  };

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Perplexity API error (${response.status}): ${errorText}`
      );
    }

    const data: PerplexityResponse = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('Perplexity API returned no choices');
    }

    return {
      content: data.choices[0].message.content,
      citations: data.citations,
      usage: data.usage,
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Perplexity API call failed:', error.message);
      throw error;
    }
    throw new Error('Unknown error calling Perplexity API');
  }
}
