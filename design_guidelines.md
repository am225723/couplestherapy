# Design Guidelines: Therapist-Assisted Couples Therapy Platform (TADI)

## Design Approach

**Selected Approach:** Design System - Hybrid of Apple HIG and Material Design  
**Justification:** This is a healthcare/therapy application requiring trust, clarity, and emotional safety. The design must prioritize usability, data clarity, and professional credibility over visual trends. We'll combine Apple's content-focused minimalism with Material's robust form and data display patterns.

**Core Principles:**
1. **Trust Through Clarity** - Clean layouts that reduce cognitive load during emotional exercises
2. **Privacy by Design** - Visual separation between private and shared content
3. **Compassionate Professionalism** - Warm but not casual, supportive but not overly designed
4. **Dual-App Cohesion** - Shared visual language but distinct purposes

---

## Typography

**Font Family:**
- Primary: Inter (Google Fonts) - exceptional readability for forms and data
- Display: Inter - maintain consistency across all contexts

**Hierarchy:**
- H1: 2.5rem (40px), font-weight 700 - Page titles
- H2: 2rem (32px), font-weight 600 - Section headers  
- H3: 1.5rem (24px), font-weight 600 - Card titles, module headers
- H4: 1.25rem (20px), font-weight 500 - Subsection headers
- Body: 1rem (16px), font-weight 400, line-height 1.6 - All content
- Small: 0.875rem (14px), font-weight 400 - Metadata, labels
- Caption: 0.75rem (12px), font-weight 500, uppercase, letter-spacing 0.05em - Tags, status

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24 for consistency
- Micro spacing (within components): p-2, gap-2, p-4
- Standard spacing (between elements): p-6, gap-6, p-8
- Section spacing: py-12, py-16, py-20
- Major layout breaks: py-24

**Grid System:**
- Desktop: max-w-7xl container with px-6
- Content areas: max-w-4xl for forms, max-w-6xl for dashboards
- Side-by-side comparisons: grid-cols-2 with gap-6

**Responsive Breakpoints:**
- Mobile: Single column, full-width cards
- Tablet (md:): 2-column layouts where appropriate
- Desktop (lg:): Full dashboard layouts with sidebars

---

## Component Library

### Navigation & Layout

**Client App - Primary Navigation:**
- Fixed top navigation bar with app logo, user profile, logout
- Sidebar navigation (left, 240px) with icon + label format
- Navigation items: Dashboard, Weekly Check-in, Gratitude Log, Shared Goals, Rituals, Conversations
- Mobile: Bottom tab bar with icons only

**Admin App - Primary Navigation:**
- Top bar with therapist profile and client roster dropdown
- When couple selected: Horizontal tab navigation for different views (Overview, Check-ins, Activity Feed, Profiles)
- Sidebar showing list of assigned couples with status indicators

**Cards:**
- Standard card: rounded-lg, shadow-sm, p-6
- Interactive card (hover): transition to shadow-md
- Activity cards: Include timestamp, user avatar, content preview

### Forms & Inputs

**Text Inputs:**
- Height: h-12 for standard inputs
- Padding: px-4
- Border radius: rounded-md
- Focus state: ring-2 ring-offset-2 (no color specified)
- Labels: text-sm font-medium mb-2

**Sliders (for 1-10 scales):**
- Height: h-2 track
- Thumb: w-5 h-5, rounded-full
- Show current value above thumb
- Labels on both ends (1, 10)

**Text Areas:**
- Minimum height: h-32
- Auto-expand for longer content
- Character count shown below (when relevant)

**Buttons:**
- Primary: px-6 py-3, rounded-md, font-medium
- Secondary: px-6 py-3, rounded-md, border-2
- Text button: px-4 py-2, font-medium
- Icon buttons: w-10 h-10, rounded-full

### Data Display

**Weekly Check-in Comparison (Admin):**
- Side-by-side layout (grid-cols-2)
- Each partner's card: p-6, rounded-lg
- Question labels: font-semibold, mb-2
- Slider responses: Visual bar representation with numeric value
- Text responses: Blockquote styling with left border-l-4

**Activity Feed:**
- Reverse chronological order
- Each item: Card with user avatar, timestamp, activity type icon
- Filtering by type: Pill-style toggles at top
- Gratitude images: Max width 400px, rounded-lg

**Love Language Profiles:**
- Bar chart representation for all 5 scores
- Primary/secondary highlighted with badges
- Side-by-side partner comparison
- Score out of 12 displayed

### Interactive Components

**Kanban Board (Shared Goals):**
- Three columns: Backlog, Doing, Done (grid-cols-3)
- Column headers: font-semibold, mb-4
- Goal cards: p-4, rounded-md, draggable with cursor-move
- Assigned to: Small avatar badge in corner
- Add card: Dashed border button at bottom of each column

**Hold Me Tight Wizard:**
- Progress indicator at top (steps 1/3, 2/3, 3/3)
- Single panel with large prompt text
- Text area for responses (h-40)
- Navigation: Previous (secondary) + Next (primary) buttons at bottom
- Partner view: Read-only with "Waiting for partner" state

**Rituals Builder:**
- Four category tabs: Mornings, Reuniting, Mealtimes, Going to Sleep
- Within each: List of rituals with edit/delete actions
- Add ritual: Inline form that expands
- Created by: Small label showing which partner added

### Therapist Features

**Contextual Comments:**
- Appears as expandable section below each activity
- Input: Textarea with "Add comment" placeholder
- Toggle: Checkbox labeled "Make this note private (only you can see)"
- Submitted comments: Speech bubble style with timestamp
- Private notes: Distinct visual treatment (italics, lock icon)

**Client Roster:**
- Card grid showing each couple
- Display: Both partner names, last activity timestamp
- Status indicators: Active check-ins pending, new activity
- Click to enter couple dashboard

---

## Images

**Hero Section (Both Apps):**
- Client App Landing/Dashboard: Large hero image (h-96) showing supportive couples imagery - abstract, warm, inclusive
- Position: Top of dashboard after login
- Overlay: Semi-transparent gradient for text readability
- CTA buttons: Backdrop-blur for visibility

**Gratitude Log:**
- User-uploaded images displayed at max-w-md, rounded-lg
- Aspect ratio maintained
- Lazy loading for performance
- Click to expand in modal

**Empty States:**
- Illustrative images for empty boards/feeds - simple, encouraging line art
- Size: w-48 centered
- Below: Encouraging text + primary action button

**Profile Avatars:**
- User avatars: w-10 h-10, rounded-full throughout
- Larger in profile view: w-24 h-24
- Fallback: Initials in geometric shape

---

## Animations

**Minimal, purposeful only:**
- Realtime comment arrival: Subtle fade-in (300ms)
- Kanban drag-and-drop: Smooth position transitions
- Form validation: Shake animation on error (200ms)
- Loading states: Skeleton screens (no spinners)
- Navigation transitions: None - instant

---

## Accessibility

- All form inputs must have associated labels
- Slider values must be announced to screen readers
- Activity feed items must have semantic structure (article, time)
- Private content clearly indicated with aria-label
- Keyboard navigation throughout
- Focus indicators visible on all interactive elements

---

## App-Specific Considerations

**Client App Focus:**
- Emotional safety and privacy paramount
- Weekly check-in: Emphasize confidentiality with visual cues
- Gratitude log: Celebrate positive moments with generous image display
- Progress indicators showing engagement over time

**Admin App Focus:**
- Data density and comparison tools
- Side-by-side layouts for partner comparison
- Efficient navigation between couples
- Clear distinction between observation and intervention
- Comment system prioritizing context and privacy toggle