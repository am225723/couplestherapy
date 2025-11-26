/**
 * CSV Export Utilities
 * Handles CSV generation with proper escaping and formatting
 */

/**
 * Escapes a value for CSV format
 * - Wraps in quotes if contains comma, quote, or newline
 * - Escapes existing quotes by doubling them
 */
export function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // Check if value needs quoting (contains comma, quote, or newline)
  const needsQuoting = /[",\n\r]/.test(stringValue);

  if (needsQuoting) {
    // Escape existing quotes by doubling them
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return stringValue;
}

/**
 * Converts an array of values to a CSV row
 */
export function toCsvRow(values: any[]): string {
  return values.map(escapeCsvValue).join(",");
}

/**
 * Generates UTF-8 BOM for Excel compatibility
 */
export function getUtf8Bom(): string {
  return "\uFEFF";
}

/**
 * Formats a date to YYYY-MM-DD
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

/**
 * Formats a timestamp to a readable date-time string
 */
export function formatDateTime(date: string | Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface CoupleReportData {
  couple: {
    id: string;
    partner1_name: string;
    partner2_name: string;
    therapist_name: string;
    relationship_since?: string;
  };
  weeklyCheckins: Array<{
    week_number: number;
    year: number;
    created_at: string;
    partner: 1 | 2;
    q_connectedness: number;
    q_conflict: number;
    q_appreciation: string;
    q_regrettable_incident: string;
    q_my_need: string;
  }>;
  gratitudeLogs: Array<{
    created_at: string;
    partner: 1 | 2;
    text_content: string | null;
    image_url: string | null;
  }>;
  sharedGoals: Array<{
    title: string;
    status: string;
    created_at: string;
    completed_at?: string | null;
  }>;
  conversations: Array<{
    conversation_type: string;
    created_at: string;
    notes_summary: string;
  }>;
  rituals: Array<{
    category: string;
    description: string;
    created_at: string;
  }>;
}

/**
 * Generates a comprehensive CSV report for a couple
 */
export function generateCoupleReport(data: CoupleReportData): string {
  const lines: string[] = [];

  // UTF-8 BOM for Excel compatibility
  lines.push(getUtf8Bom() + "Couple Progress Report");

  // SECTION 1: Couple Information Header
  lines.push(
    toCsvRow(["Partner 1", "Partner 2", "Therapist", "Report Generated"]),
  );

  lines.push(
    toCsvRow([
      data.couple.partner1_name,
      data.couple.partner2_name,
      data.couple.therapist_name,
      formatDate(new Date()),
    ]),
  );

  lines.push(""); // Empty line separator

  // SECTION 2: Weekly Check-ins
  lines.push("WEEKLY CHECK-INS");
  lines.push(
    toCsvRow([
      "Week",
      "Year",
      "Date",
      "Partner",
      "Connectedness",
      "Conflict",
      "Appreciation",
      "Regrettable Incident",
      "My Need",
    ]),
  );

  if (data.weeklyCheckins.length === 0) {
    lines.push(toCsvRow(["No check-in data available"]));
  } else {
    data.weeklyCheckins.forEach((checkin) => {
      lines.push(
        toCsvRow([
          checkin.week_number,
          checkin.year,
          formatDate(checkin.created_at),
          `Partner ${checkin.partner}`,
          checkin.q_connectedness,
          checkin.q_conflict,
          checkin.q_appreciation,
          checkin.q_regrettable_incident,
          checkin.q_my_need,
        ]),
      );
    });
  }

  lines.push(""); // Empty line separator

  // SECTION 3: Gratitude Log
  lines.push("GRATITUDE LOG");
  lines.push(toCsvRow(["Date", "Partner", "Gratitude", "Photo URL"]));

  if (data.gratitudeLogs.length === 0) {
    lines.push(toCsvRow(["No gratitude log entries"]));
  } else {
    data.gratitudeLogs.forEach((log) => {
      lines.push(
        toCsvRow([
          formatDate(log.created_at),
          `Partner ${log.partner}`,
          log.text_content || "",
          log.image_url || "",
        ]),
      );
    });
  }

  lines.push(""); // Empty line separator

  // SECTION 4: Shared Goals
  lines.push("SHARED GOALS");
  lines.push(toCsvRow(["Goal", "Status", "Created", "Completed"]));

  if (data.sharedGoals.length === 0) {
    lines.push(toCsvRow(["No shared goals"]));
  } else {
    data.sharedGoals.forEach((goal) => {
      lines.push(
        toCsvRow([
          goal.title,
          goal.status,
          formatDate(goal.created_at),
          goal.completed_at ? formatDate(goal.completed_at) : "",
        ]),
      );
    });
  }

  lines.push(""); // Empty line separator

  // SECTION 5: Conversations
  lines.push("CONVERSATIONS");
  lines.push(toCsvRow(["Type", "Date", "Notes Summary"]));

  if (data.conversations.length === 0) {
    lines.push(toCsvRow(["No conversations"]));
  } else {
    data.conversations.forEach((conv) => {
      lines.push(
        toCsvRow([
          conv.conversation_type,
          formatDate(conv.created_at),
          conv.notes_summary,
        ]),
      );
    });
  }

  lines.push(""); // Empty line separator

  // SECTION 6: Rituals
  lines.push("RITUALS OF CONNECTION");
  lines.push(toCsvRow(["Category", "Ritual Description", "Created Date"]));

  if (data.rituals.length === 0) {
    lines.push(toCsvRow(["No rituals"]));
  } else {
    data.rituals.forEach((ritual) => {
      lines.push(
        toCsvRow([
          ritual.category,
          ritual.description,
          formatDate(ritual.created_at),
        ]),
      );
    });
  }

  return lines.join("\n");
}
