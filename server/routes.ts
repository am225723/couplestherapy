import type { Express } from "express";
import { createServer, type Server } from "http";

// Import all feature-based routers
import aiRouter from "./routes/ai.js";
import attachmentRouter from "./routes/attachment.js";
import calendarRouter from "./routes/calendar.js";
import demonDialoguesRouter from "./routes/demonDialogues.js";
import echoRouter from "./routes/echo.js";
import enneagramRouter from "./routes/enneagram.js";
import financialRouter from "./routes/financial.js";
import horsemenRouter from "./routes/horsemen.js";
import ifsRouter from "./routes/ifs.js";
import intimacyRouter from "./routes/intimacy.js";
import journalRouter from "./routes/journal.js";
import loveLanguagesRouter from "./routes/loveLanguages.js";
import loveMapRouter from "./routes/loveMap.js";
import meditationRouter from "./routes/meditation.js";
import messagesRouter from "./routes/messages.js";
import moodTrackerRouter from "./routes/moodTracker.js";
import dailyTipsRouter from "./routes/dailyTips.js";
import parentingRouter from "./routes/parenting.js";
import pauseRouter from "./routes/pause.js";
import profileRouter from "./routes/profile.js";
import publicRouter from "./routes/public.js";
import therapistRouter from "./routes/therapist.js";
import therapistThoughtsRouter from "./routes/therapistThoughts.js";
import valuesVisionRouter from "./routes/valuesVision.js";
import voiceMemosRouter from "./routes/voiceMemos.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register all feature-based routers
  // Each router is mounted at its respective base path
  
  app.use("/api/ai", aiRouter);
  app.use("/api/attachment", attachmentRouter);
  app.use("/api/calendar", calendarRouter);
  app.use("/api/demon-dialogues", demonDialoguesRouter);
  app.use("/api/echo", echoRouter);
  app.use("/api/enneagram", enneagramRouter);
  app.use("/api/financial", financialRouter);
  app.use("/api/four-horsemen", horsemenRouter);
  app.use("/api/horsemen", horsemenRouter); // Alternative path for consistency
  app.use("/api/ifs", ifsRouter);
  app.use("/api/intimacy", intimacyRouter);
  app.use("/api/intimacy-mapping", intimacyRouter); // Alternative path for consistency
  app.use("/api/journal", journalRouter);
  app.use("/api/love-languages", loveLanguagesRouter);
  app.use("/api/love-map", loveMapRouter);
  app.use("/api/meditation", meditationRouter);
  app.use("/api/meditations", meditationRouter); // Alternative path for consistency
  app.use("/api/messages", messagesRouter);
  app.use("/api/mood-tracker", moodTrackerRouter);
  app.use("/api/daily-tips", dailyTipsRouter);
  app.use("/api/parenting", parentingRouter);
  app.use("/api/pause", pauseRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/therapist", therapistRouter);
  app.use("/api/therapist-thoughts", therapistThoughtsRouter);
  app.use("/api/values-vision", valuesVisionRouter);
  app.use("/api/voice-memos", voiceMemosRouter);

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
