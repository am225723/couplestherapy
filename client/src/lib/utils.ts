import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAIText(text: string): string {
  if (!text) return "";
  
  let formatted = text
    .replace(/\[\d+\]/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  
  return formatted;
}

export interface TextPart {
  type: "text" | "bold";
  content: string;
}

export function parseFormattedText(text: string): TextPart[] {
  if (!text) return [];
  
  const cleaned = formatAIText(text);
  const boldPattern = /(\*\*[^*]+\*\*)/g;
  const parts = cleaned.split(boldPattern);
  
  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return { type: "bold" as const, content: part.slice(2, -2) };
      }
      return { type: "text" as const, content: part };
    });
}
