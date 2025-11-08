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
