# Design Guidelines: ALEIX - Assisted Learning for Empathetic and Insightful Couples

## Design Approach

**Selected Approach:** Design System - Hybrid of Apple HIG and Material Design  
**Justification:** This is a healthcare/therapy application requiring trust, clarity, and emotional safety. The design must prioritize usability, data clarity, and professional credibility over visual trends. We'll combine Apple's content-focused minimalism with Material's robust form and data display patterns.

**Core Principles:**
1. **Trust Through Clarity** - Clean layouts that reduce cognitive load during emotional exercises
2. **Privacy by Design** - Visual separation between private and shared content
3. **Compassionate Professionalism** - Warm but not casual, supportive but not overly designed
4. **Dual-App Cohesion** - Shared visual language but distinct purposes

---

## Branding & Color Philosophy

**Brand Name: ALEIX**
- **A**ssisted
- **L**earning (for)
- **E**mpathetic (and)
- **I**nsightful
- **C**ouples

**Logo & Visual Identity:**
The ALEIX brand embraces minimalist line art that symbolizes connection, intimacy, and emotional intelligence. The design aesthetic uses flowing, organic lines reminiscent of two people in intimate connection, evoking both the delicate nature of relationships and the thoughtful therapeutic approach.

**Logo Usage:**
- Primary placement: Navigation header (h-10 to h-12)
- Authentication pages: Larger size (h-16 to h-24)
- Always maintain aspect ratio
- Works on both light and dark backgrounds
- Clickable logo returns to dashboard/home

**Color Palette:**

**NEW: Vibrant Multi-Color System**

The ALEIX color scheme uses a vibrant, energetic palette that conveys hope, growth, connection, and joy—essential qualities for relationship building. Unlike traditional healthcare blues, ALEIX embraces warmth and vitality through strategic use of complementary colors.

**Primary Color Spectrum:**

- **Primary (Vibrant Teal):** 
  - Light mode: `hsl(175, 70%, 45%)` - A bright, confident teal
  - Dark mode: `hsl(175, 65%, 50%)` - Slightly lighter for visibility
  - Use for: Primary actions, active states, key interactive elements

- **Secondary (Coral/Orange):**
  - Light mode: `hsl(15, 85%, 60%)` - Warm, energetic coral
  - Dark mode: `hsl(15, 75%, 55%)` - Softer coral for dark UI
  - Use for: Secondary actions, warmth accents, call-to-action elements

- **Accent (Purple):**
  - Light mode: `hsl(270, 60%, 60%)` - Creative, thoughtful purple
  - Dark mode: `hsl(270, 55%, 65%)` - Lighter purple for contrast
  - Use for: Highlighting, special features, accent elements

- **Tertiary (Pink):**
  - Light mode: `hsl(330, 70%, 65%)` - Soft, loving pink
  - Dark mode: `hsl(330, 60%, 60%)` - Muted pink for dark mode
  - Use for: Emotional content, love languages, gratitude features

**Supporting Colors:**

- **Mint Green:**
  - Light mode: `hsl(150, 50%, 92%)` - Fresh, calming mint background
  - Dark mode: `hsl(150, 30%, 20%)` - Deeper mint for contrast
  - Use for: Subtle backgrounds, secondary sections

- **Light Background Accents:**
  - Light mode: `hsl(180, 60%, 95%)` - Very light teal for highlights
  - Dark mode: `hsl(180, 40%, 18%)` - Muted teal for dark UI
  - Use for: Hover states, emphasized content areas

**Gradient Applications:**
- Hero sections: Blend primary (teal) → secondary (coral) → accent (purple)
- Cards: Subtle teal → purple gradients for depth
- Backgrounds: Multi-stop gradients (teal/coral/pink/purple) at low opacity

**Sidebar Colors:**
- Light mode: Very light teal with subtle gradient (`hsl(175, 50%, 97%)`)
- Dark mode: Deep teal (`hsl(175, 40%, 12%)`)
- Creates a distinct navigation zone while maintaining brand cohesion

**Color Philosophy:**
The vibrant multi-color palette:
- Evokes energy, hope, and vitality in relationships
- Conveys warmth and emotional connection through coral/pink tones
- Balances professionalism (teal) with creativity (purple)
- Creates visual interest and engagement
- Provides clear color-coding for different feature categories
- Works harmoniously in both light and dark modes
- Maintains accessibility standards with sufficient contrast

**Color Usage Guidelines:**
- Primary (Teal): Navigation, primary buttons, key actions
- Secondary (Coral): Secondary buttons, warm accents, encouragement
- Accent (Purple): Special features, highlights, creative exercises
- Tertiary (Pink): Love/gratitude features, emotional content
- Use gradients sparingly but purposefully for hero sections and key visual moments

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
- Fixed top navigation bar with ALEIX logo, user profile, logout
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
- Use Shadcn Input component (no manual height overrides)
- Padding: Already configured in component
- Border radius: rounded-md
- Focus state: ring-2 ring-offset-2
- Labels: text-sm font-medium mb-2

**Sliders (for 1-10 scales):**
- Height: h-2 track
- Thumb: w-5 h-5, rounded-full
- Show current value above thumb
- Labels on both ends (1, 10)

**Text Areas:**
- Use Shadcn Textarea component (no manual padding overrides)
- Auto-expand for longer content
- Character count shown below (when relevant)

**Buttons:**
- Always use Shadcn Button component with size variants
- Primary: size="default" or size="lg"
- Never manually control height/padding on buttons
- Icon buttons: size="icon"

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

## Images & Visual Assets

**Minimalist Line Art:**
- ALEIX brand aesthetic uses flowing, organic line drawings
- Subject matter: Couples in intimate connection, faces close together, intertwined forms
- Style: Single continuous line, minimal detail, elegant simplicity
- Color: Can be monochrome or colored with brand gradient
- Use cases: Hero sections, empty states, feature illustrations

**Hero Section (Both Apps):**
- Client App Landing/Dashboard: Large hero with minimalist couple line art
- Position: Top of dashboard after login or full-screen on auth page
- Overlay: Gradient overlays for text readability
- CTA buttons: Backdrop-blur for visibility

**Gratitude Log:**
- User-uploaded images displayed at max-w-md, rounded-lg
- Aspect ratio maintained
- Lazy loading for performance
- Click to expand in modal

**Empty States:**
- Illustrative line art images for empty boards/feeds - simple, encouraging
- Size: w-48 centered
- Below: Encouraging text + primary action button

**Profile Avatars:**
- User avatars: Use Shadcn Avatar component
- Standard size: w-10 h-10, rounded-full
- Larger in profile view: w-24 h-24
- Always include AvatarFallback with initials

---

## Animations

**Minimal, purposeful only:**
- Realtime comment arrival: Subtle fade-in (300ms)
- Kanban drag-and-drop: Smooth position transitions
- Form validation: Shake animation on error (200ms)
- Loading states: Skeleton screens (no spinners)
- Navigation transitions: None - instant
- NO background animations or floating orbs
- NO hover scale/transform effects on buttons (use Shadcn defaults)

---

## Accessibility

- All form inputs must have associated labels
- Slider values must be announced to screen readers
- Activity feed items must have semantic structure (article, time)
- Private content clearly indicated with aria-label
- Keyboard navigation throughout
- Focus indicators visible on all interactive elements
- All interactive elements must have data-testid attributes

---

## App-Specific Considerations

**Client App Focus:**
- Emotional safety and privacy paramount
- Weekly check-in: Emphasize confidentiality with visual cues
- Gratitude log: Celebrate positive moments with generous image display
- Progress indicators showing engagement over time
- Colorful, energetic design encourages engagement

**Admin App Focus:**
- Data density and comparison tools
- Side-by-side layouts for partner comparison
- Efficient navigation between couples
- Clear distinction between observation and intervention
- Comment system prioritizing context and privacy toggle
- Professional color scheme maintains credibility
