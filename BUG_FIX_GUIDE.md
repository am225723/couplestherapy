# TADI Platform - Bug Fix Guide

## ✅ Completed Deliverables
1. **Supabase Edge Functions** - See `SUPABASE_EDGE_FUNCTIONS_READY.md`
2. **Additional Therapy Tools** - See `ADDITIONAL_THERAPY_TOOLS.md`
3. **Voice Memo & Security Fixes** - Already completed and tested

---

## 🐛 Remaining Bug Fixes

### Priority 1: Critical Bugs (Blocking Core Features)

#### 1. Love Map Quiz - Not Working
**Status:** Requires Investigation  
**Likely Cause:** Session creation/bootstrap issue  
**Evidence:** Backend endpoints exist at `/api/love-map/*`  

**Fix Steps:**
1. Test the session endpoint manually:
   ```bash
   curl http://localhost:5000/api/love-map/session/{couple_id}
   ```
2. Check if questions endpoint returns data:
   ```bash
   curl http://localhost:5000/api/love-map/questions
   ```
3. Verify database has questions:
   ```sql
   SELECT * FROM "Couples_love_map_questions" LIMIT 5;
   ```
4. If no questions exist, seed them:
   ```sql
   INSERT INTO "Couples_love_map_questions" (question_text, category, is_active)
   VALUES 
   ('What is your partner''s biggest fear?', 'Fears & Dreams', true),
   ('What makes your partner feel most loved?', 'Love & Affection', true),
   ('What is your partner''s favorite way to spend a weekend?', 'Preferences', true);
   ```

**Expected Result:** Session creates successfully, questions load, partners can answer

---

#### 2. Echo & Empathy - Cannot Start New Session
**Status:** Likely Frontend Issue  
**Backend Code:** Looks correct (verifyUserSession, validates couple_id)  

**Diagnosis:**
- Backend expects: `couple_id`, `speaker_id`, `listener_id`, `current_step`, `status`
- Frontend sends all required fields (line 44-48 in echo-empathy.tsx)

**Fix:**
Check browser console for the actual error. Likely causes:
1. **Auth issue**: `verifyUserSession` might be failing
2. **Couple ID mismatch**: User's couple_id doesn't match what's being sent
3. **Partner profile not loaded**: `partnerProfile?.id` is null

**Quick Test:**
```typescript
// In echo-empathy.tsx, add logging before mutation:
console.log('Starting session with:', {
  speaker_id: isSpeaker ? user.id : partnerProfile.id,
  listener_id: isSpeaker ? partnerProfile.id : user.id,
  couple_id: profile!.couple_id
});
```

**Expected Fix:** Ensure `partnerProfile` is loaded before enabling start button

---

#### 3. IFS - Identifying a Part Does Not Save
**Status:** Likely Validation or Exercise Creation Issue

**Diagnosis:**
- Backend validates `exercise_id`, `user_id`, `part_name`, `when_appears`, `letter_content`
- Frontend creates exercise first, then adds parts

**Most Likely Issue:**
The exercise isn't being created or the exercise_id isn't being set correctly.

**Fix:**
In `client/src/pages/ifs-intro.tsx`, ensure:
1. Exercise is created before adding part:
   ```typescript
   const exerciseId = currentExerciseId || activeExercise?.id;
   if (!exerciseId) {
     // Create exercise first
     await createExerciseMutation.mutateAsync();
   }
   ```

2. Check if part is being sent with all required fields:
   ```typescript
   // Add logging in addPartMutation
   console.log('Adding part:', {
     exercise_id: exerciseId,
     user_id: user!.id,
     part_name: partName,
     when_appears: whenAppears,
     letter_content: letterContent,
   });
   ```

**Expected Fix:** Modify handleStartExercise to wait for exercise creation:
```typescript
const handleStartExercise = async () => {
  if (!activeExercise) {
    const newExercise = await createExerciseMutation.mutateAsync();
    setCurrentExerciseId(newExercise.id);
  }
  setShowAddDialog(true);
};
```

---

### Priority 2: Important Bugs (Affecting UX)

#### 4. Shared Pause Button - No Notification or Timer Display
**Status:** Timer exists but notification may be missing

**Current State:**
- Timer logic EXISTS (lines 96-140 in pause-button.tsx)
- Countdown displays EXISTS (timeRemaining state)
- Realtime subscription EXISTS

**Issue:** Likely the notification toast isn't visible or timer isn't rendering

**Fix:**
1. Check if timer is rendering:
   ```typescript
   // In pause-button.tsx around line 225+, ensure this exists:
   {isActive && activePauseData?.pauseEvent && (
     <div className="text-center">
       <div className="text-4xl font-bold text-primary">
         {formatTime(timeRemaining)}
       </div>
       <p className="text-muted-foreground mt-2">Time Remaining</p>
     </div>
   )}
   ```

2. Verify notification triggers:
   - Check lines 154-157 for toast after activation
   - Ensure Realtime subscription (lines 48-94) is working

**Expected Result:** Both partners see countdown timer and get toast notification

---

#### 5. Messages - Don't Send to Therapist or Show Up
**Status:** Needs Testing - Backend looks correct

**Backend Verification:**
- POST /api/messages validates therapist access (lines 1709-1724)
- GET /api/messages fetches all messages for couple

**Test:**
1. Login as therapist
2. Navigate to Messages page
3. Try sending a message
4. Check browser console for errors

**Most Likely Issue:**
Frontend isn't fetching messages correctly or therapist doesn't have couple_id.

**Fix:**
Therapist needs to view messages from couples dashboard (since they don't have a couple_id in their profile). Update messages page:
```typescript
// Instead of using profile.couple_id, allow therapist to view specific couple:
const coupleId = profile?.role === 'therapist' 
  ? searchParams.get('couple_id')  // From URL param
  : profile?.couple_id;
```

---

#### 6. Calendar - Provides 400 Error
**Status:** Date serialization issue

**Diagnosis:**
Backend converts strings to Date objects (lines 1908-1909):
```typescript
start_at: req.body.start_at ? new Date(req.body.start_at) : undefined,
```

**Issue:** Frontend might be sending Date objects that get JSON-stringified incorrectly.

**Fix:**
In `client/src/pages/calendar.tsx`, ensure dates are ISO strings:
```typescript
// In createEventMutation (line 151-156):
mutationFn: async (data: EventFormValues) => {
  const response = await apiRequest('POST', '/api/calendar', {
    ...data,
    couple_id: profile!.couple_id,  // ADD THIS
    start_at: data.start_at.toISOString(),
    end_at: data.end_at.toISOString(),
  });
  return response.json();
},
```

---

### Priority 3: Enhancement Requests

#### 7. Show Rituals on Dashboard Based on Time Period
**Status:** Feature Enhancement

**Current State:** Dashboard doesn't show rituals

**Implementation:**
1. Fetch rituals in `client/src/pages/client-dashboard.tsx`:
   ```typescript
   const { data: rituals } = useQuery({
     queryKey: ['/api/rituals', profile?.couple_id],
     enabled: !!profile?.couple_id,
   });
   ```

2. Filter by time period:
   ```typescript
   const thisWeekRituals = rituals?.filter(r => {
     const ritualDate = new Date(r.last_completed);
     const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
     return ritualDate >= weekAgo;
   });
   ```

3. Display in dashboard card

---

#### 8. Hold Me Tight - Error About "initiator" Column
**Status:** Database Schema Issue

**Diagnosis:**
- Frontend uses `initiator_id` (correct)
- Backend uses `initiator_id` (correct)
- Database might have old `initiator` column

**Fix:**
Check and update database schema:
```sql
-- Check current schema
\d "Couples_conversations"

-- If 'initiator' column exists, rename it:
ALTER TABLE "Couples_conversations" 
RENAME COLUMN initiator TO initiator_id;

-- OR if you need to add it:
ALTER TABLE "Couples_conversations"
ADD COLUMN IF NOT EXISTS initiator_id VARCHAR REFERENCES "Couples_profiles"(id);
```

**Alternative:** The error might be in the export CSV endpoint. Check line 683 in server/routes.ts - it references `conv.initiator_statement_feel` which is correct.

---

#### 9. Voice Memos - Sent Memos Don't Show Under Sent Tab
**Status:** Already Fixed (Frontend filtering is correct)

**Current Code (line 231-232):**
```typescript
const receivedMemos = memos?.filter(m => m.recipient_id === profile?.id) || [];
const sentMemos = memos?.filter(m => m.sender_id === profile?.id) || [];
```

**If still not working:**
1. Check if backend returns `sender_id` and `recipient_id`:
   ```bash
   curl http://localhost:5000/api/voice-memos
   ```
2. Verify complete endpoint saves memo correctly
3. Check that memos have proper sender_id when created (line 163-167 in voice-memos.tsx)

---

## 🔧 Quick Debugging Steps

### General Debugging Process
1. **Check browser console** for errors
2. **Check network tab** for failed requests (400/500 errors)
3. **Check backend logs** for detailed error messages
4. **Test API endpoints directly** using curl or Postman
5. **Verify database data** using SQL queries

### Common Issues Checklist
- [ ] User is authenticated (check session)
- [ ] User has couple_id (required for most features)
- [ ] Database tables exist and have data
- [ ] Supabase RLS policies allow access
- [ ] Environment variables are set correctly
- [ ] Frontend and backend are on same domain/port

---

## 🚀 Testing Recommendations

After fixes, test each feature:

1. **Love Map Quiz**
   - Login as both partners
   - Complete all 3 phases
   - Verify results show correctly

2. **Echo & Empathy**
   - Start session as speaker
   - Partner sees session
   - Complete all 3 steps

3. **IFS**
   - Create exercise
   - Add multiple parts
   - Edit and delete parts

4. **Pause Button**
   - Activate pause
   - Partner sees countdown
   - Timer counts down
   - Pause ends automatically

5. **Messages**
   - Send from client to therapist
   - Therapist receives and replies
   - Messages show in correct order

6. **Calendar**
   - Create event
   - Edit event
   - Delete event
   - Events sync between partners

---

## 📊 Database Health Check

Run these queries to verify data integrity:

```sql
-- Check if couples have all required data
SELECT c.id, c.partner1_id, c.partner2_id, c.therapist_id,
       p1.full_name as partner1_name, p2.full_name as partner2_name
FROM "Couples_couples" c
LEFT JOIN "Couples_profiles" p1 ON c.partner1_id = p1.id
LEFT JOIN "Couples_profiles" p2 ON c.partner2_id = p2.id;

-- Check for active Love Map sessions
SELECT * FROM "Couples_love_map_sessions" 
WHERE status = 'in_progress';

-- Check for active Echo sessions
SELECT * FROM "Couples_echo_sessions"
WHERE status = 'in_progress';

-- Check for active Pause events
SELECT * FROM "Couples_pause_events"
WHERE ended_at IS NULL;

-- Check voice memos
SELECT id, sender_id, recipient_id, duration_secs, created_at, is_listened
FROM "Couples_voice_memos"
ORDER BY created_at DESC
LIMIT 10;
```

---

## 💡 Next Steps

1. Start with **Priority 1** bugs (blocking core features)
2. Test each fix thoroughly before moving to next
3. Use the provided SQL queries to verify database state
4. Check browser console and network tab for detailed errors
5. Consider adding Sentry or similar error tracking for production

---

## 🆘 If Stuck

1. **Check the logs:**
   ```bash
   # Backend logs
   npm run dev
   
   # Check Supabase logs in dashboard
   ```

2. **Verify auth is working:**
   ```typescript
   console.log('User:', user);
   console.log('Profile:', profile);
   console.log('Couple ID:', profile?.couple_id);
   ```

3. **Test backend directly:**
   ```bash
   # Replace with actual endpoint
   curl http://localhost:5000/api/endpoint \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **Check database directly:**
   - Open Supabase dashboard
   - Go to Table Editor
   - Verify data exists and structure is correct

---

## Summary

Most bugs appear to be:
1. **Session/Auth issues** - User or couple_id not available
2. **Database schema** - Missing data or column mismatches
3. **Frontend state management** - Data not loaded before use
4. **Date serialization** - Date vs ISO string format

The architecture is solid - most issues are small fixes rather than major refactoring.
end 