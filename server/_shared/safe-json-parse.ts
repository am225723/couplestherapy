/**
 * Safely parses a JSON string, returning a default value if parsing fails.
 * @param jsonString The JSON string to parse.
 * @param defaultValue The value to return if parsing fails.
 * @returns The parsed object or the default value.
 */
export function safeJsonParse(jsonString: string, defaultValue: any = null) {
  if (!jsonString || typeof jsonString !== 'string') {
    return defaultValue;
  }
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return defaultValue;
  }
}
