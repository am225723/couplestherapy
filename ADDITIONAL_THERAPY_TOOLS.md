# Additional Couples & Marriage Counseling Tools

Based on evidence-based therapeutic modalities, here are additional tools that would enhance the TADI platform:

## 1. **Gottman Sound Relationship House**

### Turn Towards vs Turn Away Tracker
- Log daily "bids for connection" and responses
- Track ratio of positive responses (Gottman's 5:1 ratio)
- Weekly report showing turning towards percentage
- Notification reminders to notice partner's bids

### Gottman Four Horsemen Tracker
- Self-report when experiencing: Criticism, Contempt, Defensiveness, Stonewalling
- Partner validates or disputes observation
- Trends over time visualization
- AI-powered suggestions for antidotes

## 2. **Emotionally Focused Therapy (EFT) Extensions**

### Demon Dialogues Recognition
- Guided identification of negative cycles (Find the Bad Guy, Protest Polka, Freeze and Flee)
- Real-time pause during conflict with cycle identifier
- Exercises to break each specific pattern
- Progress tracking on cycle frequency

### Attachment Needs Exploration
- Weekly reflection on attachment security
- Exercises to identify attachment injuries
- Partner attunement practice sessions
- Secure base/safe haven check-ins

## 3. **Mindfulness & Acceptance**

### Couples Meditation Library
- Guided meditations for connection (10-20 min)
- Loving-kindness practice for partner
- Body scan for couples (parallel practice)
- Breathwork exercises during conflict

### Gratitude & Appreciation
- Daily appreciation prompts (already have gratitude log)
- Specific gratitude categories (Acts of Service, Words of Affirmation, etc.)
- Random appreciation notifications
- Monthly gratitude highlights compilation

## 4. **Intimacy Builders**

### Intimacy Mapping
- Track different types of intimacy: Physical, Emotional, Intellectual, Experiential, Spiritual
- Weekly ratings for each dimension
- Goal-setting for intimacy growth areas
- Suggestions for enhancing each type

### Date Night Archive & Reflection
- Photo/journal uploads from dates
- Post-date reflection questions
- "Best moments" collection
- Anniversary of first dates reminders

## 5. **Conflict Resolution**

### Fair Fighting Rules
- Before-conflict agreement on "house rules"
- During-conflict pause button with rules reminder
- Post-conflict repair checklist
- Success celebration when following rules

### Speaker-Listener Technique (PREP)
- Structured turn-taking with timer
- "Floor" indicator showing who's speaking
- Paraphrasing validation before responding
- Recording for self-review (audio only, private)

## 6. **Values & Vision**

### Shared Dreams & Goals
- Individual dreams sharing exercise
- Identify overlapping vs. different dreams
- Honor each other's dreams ritual
- Create shared vision board (digital)
- 1-year, 5-year, 10-year vision planning

### Legacy Building
- "What we want to be known for as a couple"
- Family values definition
- Community contribution goals
- Generativity planning (for older couples)

## 7. **Sexual Intimacy (Therapeutic Focus)**

### Desire Discrepancy Navigator
- Safe space to discuss frequency preferences
- Compromise finder with "good enough" zone
- Responsive vs. spontaneous desire education
- Scheduled intimacy without pressure

### Sensate Focus Tracker
- Progressive exercises from Sensate Focus therapy
- Non-demand pleasure focus
- Communication practice during touch
- Gradual progression tracking

## 8. **Trauma-Informed Features**

### Safety Check-Ins
- Daily emotional safety ratings
- Trigger identification and tracking
- Grounding exercises library
- Professional crisis resources always visible

### Trauma Timeline (for therapist view only)
- Couple's relational trauma history
- Individual trauma impact on relationship
- Healing milestones tracking
- Resilience building exercises

## 9. **Parenting as Partners (if applicable)**

### Co-Parenting Alignment
- Parenting style assessment
- Discipline approach agreement builder
- United front practice scenarios
- Parenting stress check-ins

### Couple Time Protection
- Child-free time scheduling
- Intimacy despite kids reminder system
- Energy management for romance
- Reconnection after parenting conflicts

## 10. **Behavioral Activation**

### Relationship Activation Schedule
- Pleasant activity scheduling
- Novelty and adventure planner
- Shared interest discovery
- Activity accountability tracking

## 11. **Financial Intimacy**

### Money Conversation Facilitator
- Money scripts/beliefs assessment
- Budget transparency dashboard (optional)
- Financial goal alignment
- Spending/saving style discussion prompts

### Money Date Template
- Monthly financial check-in structure
- Celebration of wins
- Stress-free money talk guidelines
- Future planning exercises

## 12. **Extended Family & Social Support**

### Boundary Setting Tool
- Identify boundary violations
- Couple's unified boundary practice
- Difficult conversation scripts
- Progress tracking on boundaries

### Social Connection Health
- Couple friendships tracker
- Individual friendships support
- Isolation vs. connection balance
- Social events planning together

## 13. **Crisis Management**

### Affair Recovery Program
- Structured 13-week recovery path
- Transparency exercises
- Rebuilding trust milestones
- Therapist-guided check-ins

### Separation Discernment
- For couples considering separation
- Structured decision-making framework
- Individual vs. couple work balance
- Last-attempt interventions

## 14. **Celebration & Play**

### Micro-Moments of Joy
- Quick connection rituals (30 seconds)
- Inside jokes library
- Playful challenges
- Celebration of small wins

### Anniversary & Milestone Tracker
- Relationship timeline
- Auto-reminders for important dates
- Milestone celebration ideas
- Memory lane photo albums

## 15. **Research & Insights**

### Relationship Science Library
- Bite-sized research findings
- Myth-busting articles
- Expert video interviews
- Evidence-based tip of the week

---

## Implementation Priority with Technical Guidance

### **Phase 1: High Impact, Low Complexity** (2-3 weeks)

#### 1. Gottman Four Horsemen Tracker
**Database Schema:**
```typescript
// shared/schema.ts
export const horsemenIncidents = pgTable("Couples_horsemen_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couple_id: varchar("couple_id").notNull().references(() => couples.id),
  reporter_id: varchar("reporter_id").notNull().references(() => profiles.id),
  horseman_type: varchar("horseman_type").$type<"criticism" | "contempt" | "defensiveness" | "stonewalling">().notNull(),
  situation: text("situation"),
  partner_validated: boolean("partner_validated"),
  antidote_practiced: boolean("antidote_practiced"),
  created_at: timestamp("created_at").defaultNow(),
});
```

**API Routes:**
- `POST /api/horsemen/incident` - Log incident
- `GET /api/horsemen/:couple_id` - Get history
- `PATCH /api/horsemen/:id/validate` - Partner validation

**Frontend:**
- Add to client dashboard as "Conflict Patterns" card
- Simple form with 4 buttons for each horseman
- Weekly trend chart using recharts
- Antidote suggestions modal

**Estimated Effort:** 3-4 days

#### 2. Fair Fighting Rules
**Database Schema:**
```typescript
export const fightingRules = pgTable("Couples_fighting_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couple_id: varchar("couple_id").notNull().references(() => couples.id),
  rule_text: text("rule_text").notNull(),
  is_agreed: boolean("is_agreed").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export const conflictInstances = pgTable("Couples_conflict_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couple_id: varchar("couple_id").notNull().references(() => couples.id),
  rules_followed: boolean("rules_followed"),
  rules_broken: text("rules_broken").array(),
  repair_attempted: boolean("repair_attempted"),
  created_at: timestamp("created_at").defaultNow(),
});
```

**Integration:** Extend existing Pause Button feature
- When pause ends, show "How did it go?" form
- Checklist of agreed rules
- Success celebration if all followed

**Estimated Effort:** 2-3 days

#### 3. Intimacy Mapping
**Database Schema:**
```typescript
export const intimacyRatings = pgTable("Couples_intimacy_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couple_id: varchar("couple_id").notNull().references(() => couples.id),
  user_id: varchar("user_id").notNull().references(() => profiles.id),
  week_number: integer("week_number").notNull(),
  year: integer("year").notNull(),
  physical: integer("physical"),
  emotional: integer("emotional"),
  intellectual: integer("intellectual"),
  experiential: integer("experiential"),
  spiritual: integer("spiritual"),
  created_at: timestamp("created_at").defaultNow(),
});
```

**Frontend:**
- Radar chart visualization (use recharts)
- Weekly check-in integration (add to existing Couples_weekly_checkins)
- Goal setting for low-scoring dimensions

**Estimated Effort:** 4-5 days

### **Phase 2: Moderate Impact, Moderate Complexity** (4-6 weeks)

#### 4. Demon Dialogues Recognition (EFT)
**Database Schema:**
```typescript
export const demonDialogues = pgTable("Couples_demon_dialogues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couple_id: varchar("couple_id").notNull().references(() => couples.id),
  dialogue_type: varchar("dialogue_type").$type<"find_bad_guy" | "protest_polka" | "freeze_flee">().notNull(),
  recognized_by: varchar("recognized_by").notNull().references(() => profiles.id),
  interrupted: boolean("interrupted").default(false),
  created_at: timestamp("created_at").defaultNow(),
});
```

**Integration:** Leverage existing Pause Button
- Add "Which pattern?" during pause
- Track frequency over time
- AI-powered pattern detection from check-ins

**Estimated Effort:** 5-7 days

#### 5. Speaker-Listener Technique (PREP)
**Database Schema:**
```typescript
export const speakerListenerSessions = pgTable("Couples_speaker_listener_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couple_id: varchar("couple_id").notNull().references(() => couples.id),
  current_speaker_id: varchar("current_speaker_id").notNull().references(() => profiles.id),
  topic: text("topic").notNull(),
  turn_duration_secs: integer("turn_duration_secs").default(180),
  turns_completed: integer("turns_completed").default(0),
  status: varchar("status").$type<"in_progress" | "completed">().default("in_progress"),
  created_at: timestamp("created_at").defaultNow(),
});
```

**Frontend:**
- Visual "floor" indicator (who holds the floor)
- Timer with turn switching
- Paraphrasing requirement before responding

**Estimated Effort:** 6-8 days

### **Phase 3: High Impact, High Complexity** (8-12 weeks)

#### 6. Meditation Library
**Implementation:**
- Use existing Supabase Storage for audio files
- Add metadata table for meditations:
```typescript
export const meditations = pgTable("Couples_meditations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  duration_mins: integer("duration_mins"),
  category: varchar("category").$type<"connection" | "loving_kindness" | "body_scan" | "breathwork">(),
  audio_url: text("audio_url"),
  transcript: text("transcript"),
});

export const meditationSessions = pgTable("Couples_meditation_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  couple_id: varchar("couple_id").notNull().references(() => couples.id),
  meditation_id: varchar("meditation_id").notNull().references(() => meditations.id),
  user_id: varchar("user_id").notNull().references(() => profiles.id),
  completed: boolean("completed").default(false),
  created_at: timestamp("created_at").defaultNow(),
});
```

**Content Sources:**
- Record custom guided meditations (therapist collaboration)
- OR partner with Insight Timer/Calm for content licensing

**Estimated Effort:** 10-14 days (excluding content creation)

### **Phase 4: Nice to Have** (Future Roadmap)

Implementation details available upon request. Focus on Phases 1-3 first to maximize ROI.

---

## Integration with Existing Features

Many of these tools can leverage your existing infrastructure:
- **Real-time updates**: Use existing Supabase Realtime
- **AI insights**: Extend Perplexity AI integration
- **Notifications**: Build on Pause Button notification system
- **Therapist view**: Add to existing Analytics dashboard
- **Progress tracking**: Use patterns from Love Map & Gratitude Log

---

## References

- **Gottman Method**: The Seven Principles for Making Marriage Work
- **EFT**: Hold Me Tight by Dr. Sue Johnson (already implementing)
- **PREP**: Fighting for Your Marriage by Markman, Stanley, & Blumberg
- **IFS**: Already implementing (Internal Family Systems)
- **Sensate Focus**: Masters & Johnson sex therapy research
- **Attachment Theory**: Attached by Levine & Heller
