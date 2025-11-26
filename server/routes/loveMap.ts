import { Router } from "express";
import { supabaseAdmin } from "../supabase.js";
import { verifyUserSession, verifyTherapistSession } from "../helpers.js";

const router = Router();

// GET /questions - Fetch all active questions
router.get("/questions", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { data: questions, error } = await supabaseAdmin
      .from("Couples_love_map_questions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json(questions || []);
  } catch (error: any) {
    console.error(
      "Error fetching Love Map questions:",
      error.message,
      error.stack,
    );
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch questions" });
  }
});

// GET /session/:couple_id - Get or create active session for couple
router.get("/session/:couple_id", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { couple_id } = req.params;
    const { userId, coupleId } = authResult;

    // Verify user belongs to this couple
    if (couple_id !== coupleId) {
      return res.status(403).json({ error: "Access denied to this couple" });
    }

    // Look for active session (not completed)
    const { data: sessions, error: sessionError } = await supabaseAdmin
      .from("Couples_love_map_sessions")
      .select("*")
      .eq("couple_id", couple_id)
      .is("completed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (sessionError) throw sessionError;

    // If active session exists, return it
    if (sessions && sessions.length > 0) {
      return res.json(sessions[0]);
    }

    // Create new session
    const { data: newSession, error: createError } = await supabaseAdmin
      .from("Couples_love_map_sessions")
      .insert({ couple_id })
      .select()
      .single();

    if (createError) throw createError;

    res.json(newSession);
  } catch (error: any) {
    console.error(
      "Error getting/creating Love Map session:",
      error.message,
      error.stack,
    );
    res.status(500).json({ error: error.message || "Failed to get session" });
  }
});

// POST /truths - Submit self-answers (batch insert)
router.post("/truths", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId, coupleId } = authResult;
    const { session_id, truths } = req.body;

    // Validate truths array
    if (!Array.isArray(truths) || truths.length === 0) {
      return res.status(400).json({ error: "Truths array is required" });
    }

    // Verify session belongs to user's couple
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("Couples_love_map_sessions")
      .select("couple_id, partner1_truths_completed, partner2_truths_completed")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.couple_id !== coupleId) {
      return res.status(403).json({ error: "Access denied to this session" });
    }

    // Get couple info to determine which partner this is
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("partner1_id, partner2_id")
      .eq("id", coupleId)
      .single();

    if (coupleError || !couple) {
      return res.status(404).json({ error: "Couple not found" });
    }

    const isPartner1 = couple.partner1_id === userId;

    // Delete existing truths for this user and session (allow re-submission)
    await supabaseAdmin
      .from("Couples_love_map_truths")
      .delete()
      .eq("session_id", session_id)
      .eq("author_id", userId);

    // Insert new truths
    const truthsToInsert = truths.map((truth: any) => ({
      session_id,
      question_id: truth.question_id,
      author_id: userId,
      answer_text: truth.answer_text,
    }));

    const { data: insertedTruths, error: insertError } = await supabaseAdmin
      .from("Couples_love_map_truths")
      .insert(truthsToInsert)
      .select();

    if (insertError) throw insertError;

    // Update session to mark truths as completed for this partner
    const updateField = isPartner1
      ? "partner1_truths_completed"
      : "partner2_truths_completed";
    const { error: updateError } = await supabaseAdmin
      .from("Couples_love_map_sessions")
      .update({ [updateField]: true })
      .eq("id", session_id);

    if (updateError) throw updateError;

    res.json({ success: true, truths: insertedTruths });
  } catch (error: any) {
    console.error("Error submitting Love Map truths:", error);
    res.status(500).json({ error: error.message || "Failed to submit truths" });
  }
});

// POST /guesses - Submit partner guesses (batch insert)
router.post("/guesses", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId, coupleId, partnerId } = authResult;
    const { session_id, guesses } = req.body;

    // Validate guesses array
    if (!Array.isArray(guesses) || guesses.length === 0) {
      return res.status(400).json({ error: "Guesses array is required" });
    }

    // Verify session belongs to user's couple
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("Couples_love_map_sessions")
      .select("couple_id")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.couple_id !== coupleId) {
      return res.status(403).json({ error: "Access denied to this session" });
    }

    // Get partner's truths for this session
    const { data: partnerTruths, error: truthsError } = await supabaseAdmin
      .from("Couples_love_map_truths")
      .select("*")
      .eq("session_id", session_id)
      .eq("author_id", partnerId);

    if (truthsError) throw truthsError;

    if (!partnerTruths || partnerTruths.length === 0) {
      return res
        .status(400)
        .json({ error: "Partner has not completed truths yet" });
    }

    // Create truth lookup map
    const truthMap = new Map(partnerTruths.map((t) => [t.question_id, t]));

    // Delete existing guesses for this user and session (allow re-submission)
    await supabaseAdmin
      .from("Couples_love_map_guesses")
      .delete()
      .eq("session_id", session_id)
      .eq("guesser_id", userId);

    // Calculate correctness and prepare guesses to insert
    const guessesToInsert = guesses.map((guess: any) => {
      const partnerTruth = truthMap.get(guess.question_id);
      if (!partnerTruth) {
        throw new Error(`No truth found for question ${guess.question_id}`);
      }

      // Case-insensitive comparison, trimmed
      const guessText = guess.guess_text.trim().toLowerCase();
      const truthText = partnerTruth.answer_text.trim().toLowerCase();
      const isCorrect = guessText === truthText;

      return {
        session_id,
        question_id: guess.question_id,
        guesser_id: userId,
        truth_id: partnerTruth.id,
        guess_text: guess.guess_text,
        is_correct: isCorrect,
      };
    });

    const { data: insertedGuesses, error: insertError } = await supabaseAdmin
      .from("Couples_love_map_guesses")
      .insert(guessesToInsert)
      .select();

    if (insertError) throw insertError;

    // Get couple info to determine which partner this is
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("partner1_id, partner2_id")
      .eq("id", coupleId)
      .single();

    if (coupleError || !couple) {
      return res.status(404).json({ error: "Couple not found" });
    }

    const isPartner1 = couple.partner1_id === userId;

    // Calculate score (percentage correct)
    const correctCount = guessesToInsert.filter((g) => g.is_correct).length;
    const totalCount = guessesToInsert.length;
    const score = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

    // Update session to mark guesses as completed and store score
    const updateField = isPartner1
      ? "partner1_guesses_completed"
      : "partner2_guesses_completed";
    const scoreField = isPartner1 ? "partner1_score" : "partner2_score";

    const { error: updateError } = await supabaseAdmin
      .from("Couples_love_map_sessions")
      .update({
        [updateField]: true,
        [scoreField]: score.toFixed(2),
      })
      .eq("id", session_id);

    if (updateError) throw updateError;

    res.json({ success: true, guesses: insertedGuesses, score });
  } catch (error: any) {
    console.error("Error submitting Love Map guesses:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to submit guesses" });
  }
});

// GET /results/:session_id - Get reveal results with side-by-side comparison
router.get("/results/:session_id", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { userId, coupleId, partnerId } = authResult;
    const { session_id } = req.params;

    // Verify session belongs to user's couple
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("Couples_love_map_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.couple_id !== coupleId) {
      return res.status(403).json({ error: "Access denied to this session" });
    }

    // Get all questions
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("Couples_love_map_questions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (questionsError) throw questionsError;

    // Get all truths for this session
    const { data: truths, error: truthsError } = await supabaseAdmin
      .from("Couples_love_map_truths")
      .select("*")
      .eq("session_id", session_id);

    if (truthsError) throw truthsError;

    // Get all guesses for this session
    const { data: guesses, error: guessesError } = await supabaseAdmin
      .from("Couples_love_map_guesses")
      .select("*")
      .eq("session_id", session_id);

    if (guessesError) throw guessesError;

    // Build comparison data
    const myTruths = (truths || []).filter((t) => t.author_id === userId);
    const partnerTruths = (truths || []).filter(
      (t) => t.author_id === partnerId,
    );
    const myGuesses = (guesses || []).filter((g) => g.guesser_id === userId);
    const partnerGuesses = (guesses || []).filter(
      (g) => g.guesser_id === partnerId,
    );

    const results = (questions || []).map((question) => {
      const myTruth = myTruths.find((t) => t.question_id === question.id);
      const partnerTruth = partnerTruths.find(
        (t) => t.question_id === question.id,
      );
      const myGuess = myGuesses.find((g) => g.question_id === question.id);
      const partnerGuess = partnerGuesses.find(
        (g) => g.question_id === question.id,
      );

      return {
        question_id: question.id,
        question_text: question.question_text,
        category: question.category,
        my_answer: myTruth?.answer_text || null,
        partner_answer: partnerTruth?.answer_text || null,
        my_guess: myGuess?.guess_text || null,
        partner_guess: partnerGuess?.guess_text || null,
        my_guess_correct: myGuess?.is_correct || false,
        partner_guess_correct: partnerGuess?.is_correct || false,
      };
    });

    res.json({
      session,
      results,
      my_score:
        session.partner1_id === userId
          ? session.partner1_score
          : session.partner2_score,
      partner_score:
        session.partner1_id === userId
          ? session.partner2_score
          : session.partner1_score,
    });
  } catch (error: any) {
    console.error("Error fetching Love Map results:", error);
    res.status(500).json({ error: error.message || "Failed to fetch results" });
  }
});

// PATCH /session/:session_id/complete - Mark session as complete
router.patch("/session/:session_id/complete", async (req, res) => {
  try {
    const authResult = await verifyUserSession(req);
    if (!authResult.success) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    const { coupleId } = authResult;
    const { session_id } = req.params;

    // Verify session belongs to user's couple
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("Couples_love_map_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.couple_id !== coupleId) {
      return res.status(403).json({ error: "Access denied to this session" });
    }

    // Mark as complete
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("Couples_love_map_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", session_id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json(updatedSession);
  } catch (error: any) {
    console.error("Error completing Love Map session:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to complete session" });
  }
});

// GET /therapist/:couple_id - View Love Map results for assigned couple (therapist only)
router.get("/therapist/:couple_id", async (req, res) => {
  try {
    const therapistAuth = await verifyTherapistSession(req);
    if (!therapistAuth.success) {
      return res
        .status(therapistAuth.status)
        .json({ error: therapistAuth.error });
    }

    const { couple_id } = req.params;

    // Verify therapist is assigned to this couple
    const { data: couple, error: coupleError } = await supabaseAdmin
      .from("Couples_couples")
      .select("*")
      .eq("id", couple_id)
      .eq("therapist_id", therapistAuth.therapistId)
      .single();

    if (coupleError || !couple) {
      return res.status(403).json({ error: "Access denied to this couple" });
    }

    // Get most recent completed session
    const { data: sessions, error: sessionError } = await supabaseAdmin
      .from("Couples_love_map_sessions")
      .select("*")
      .eq("couple_id", couple_id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1);

    if (sessionError) throw sessionError;

    if (!sessions || sessions.length === 0) {
      return res.json({ session: null, results: [] });
    }

    const session = sessions[0];

    // Get all questions
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from("Couples_love_map_questions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (questionsError) throw questionsError;

    // Get all truths
    const { data: truths, error: truthsError } = await supabaseAdmin
      .from("Couples_love_map_truths")
      .select("*")
      .eq("session_id", session.id);

    if (truthsError) throw truthsError;

    // Get all guesses
    const { data: guesses, error: guessesError } = await supabaseAdmin
      .from("Couples_love_map_guesses")
      .select("*")
      .eq("session_id", session.id);

    if (guessesError) throw guessesError;

    // Get partner profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("Couples_profiles")
      .select("id, full_name")
      .in("id", [couple.partner1_id, couple.partner2_id]);

    if (profilesError) throw profilesError;

    const partner1 = profiles?.find((p) => p.id === couple.partner1_id);
    const partner2 = profiles?.find((p) => p.id === couple.partner2_id);

    const partner1Truths = (truths || []).filter(
      (t) => t.author_id === couple.partner1_id,
    );
    const partner2Truths = (truths || []).filter(
      (t) => t.author_id === couple.partner2_id,
    );
    const partner1Guesses = (guesses || []).filter(
      (g) => g.guesser_id === couple.partner1_id,
    );
    const partner2Guesses = (guesses || []).filter(
      (g) => g.guesser_id === couple.partner2_id,
    );

    const results = (questions || []).map((question) => {
      const p1Truth = partner1Truths.find((t) => t.question_id === question.id);
      const p2Truth = partner2Truths.find((t) => t.question_id === question.id);
      const p1Guess = partner1Guesses.find(
        (g) => g.question_id === question.id,
      );
      const p2Guess = partner2Guesses.find(
        (g) => g.question_id === question.id,
      );

      return {
        question_id: question.id,
        question_text: question.question_text,
        category: question.category,
        partner1_answer: p1Truth?.answer_text || null,
        partner2_answer: p2Truth?.answer_text || null,
        partner1_guess: p1Guess?.guess_text || null,
        partner2_guess: p2Guess?.guess_text || null,
        partner1_guess_correct: p1Guess?.is_correct || false,
        partner2_guess_correct: p2Guess?.is_correct || false,
      };
    });

    res.json({
      session,
      partner1_name: partner1?.full_name || "Partner 1",
      partner2_name: partner2?.full_name || "Partner 2",
      partner1_score: session.partner1_score,
      partner2_score: session.partner2_score,
      results,
    });
  } catch (error: any) {
    console.error("Error fetching therapist Love Map view:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch Love Map data" });
  }
});

export default router;
