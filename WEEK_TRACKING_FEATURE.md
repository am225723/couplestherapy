# Week Number Tracking & Historical Timeline Feature

## Overview

The weekly check-in system now includes automatic ISO week number tracking and a comprehensive historical timeline view for couples to review their progress over time.

## What's New

### 1. Automatic Week Tracking

- **ISO Week Numbers**: Uses standard ISO 8601 week numbering (Week 1-53)
- **Year Tracking**: Tracks the ISO year to handle year boundaries correctly
- **Database Triggers**: Automatically calculates and sets week_number and year on insert
- **No Manual Input**: Couples don't need to worry about week numbers - it's all automated

### 2. Historical Timeline View

- **Chronological History**: View all past check-ins organized by week and year
- **Trend Indicators**: Visual badges showing improvement or areas needing attention
- **Connection Scores**: See connectedness and conflict scores at a glance
- **Full Reflections**: Read complete responses for each week

### 3. Progress Tracking

- **Week-over-Week Comparison**: Compare your current scores with previous weeks
- **Visual Trends**: See if connection is improving, declining, or stable
- **Complete History**: Access all past check-ins in one place

## Setup Instructions

### Step 1: Run the Week Tracking Upgrade Script

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/froxodstewdswllgokmu
2. Click **"SQL Editor"** → **"New query"**
3. Copy and paste the contents of `supabase-week-tracking-upgrade.sql`
4. Click **"Run"**

This script will:

- Add a `year` column to the Couples_weekly_checkins table
- Create indexes for faster queries
- Add database triggers to auto-calculate week_number and year
- Update existing records with correct year values

### Step 2: Access the Feature

Once the upgrade script is run, users can:

1. **Submit Weekly Check-Ins**: Week numbers are automatically calculated
2. **View History**: Click the "Check-In History" card on the dashboard
3. **Track Progress**: See trends and compare weeks over time

## Technical Details

### Database Schema Changes

```sql
-- New column
year INT

-- New indexes
idx_weekly_checkins_week_year ON (couple_id, year DESC, week_number DESC)

-- New functions
get_iso_week_number(check_date TIMESTAMPTZ) → INT
get_iso_week_year(check_date TIMESTAMPTZ) → INT

-- New trigger
trigger_set_week_number_and_year BEFORE INSERT
```

### Frontend Components

**New Page**: `/checkin-history`

- Displays all check-ins grouped by week and year
- Shows trend indicators (improving vs needs attention)
- Displays full reflection content
- Calculates week-over-week changes

**Dashboard Update**:

- New "Check-In History" card with prominent placement
- Direct link to timeline view
- Visual indication with Calendar and TrendingUp icons

### API Integration

The historical view uses the standard Supabase query:

```typescript
queryKey: ["/api/weekly-checkins/history", profile?.couple_id];
```

Data is automatically filtered by:

- User's couple_id (via RLS policies)
- Sorted by year and week (most recent first)

## User Experience

### For Couples

1. **Automatic Tracking**: Just fill out the weekly check-in - week numbers are automatic
2. **Easy Access**: Click "Check-In History" on the dashboard
3. **Visual Progress**: See at a glance if things are improving
4. **Complete History**: Access all past reflections

### For Therapists

- Side-by-side comparison view now includes week numbers
- Can track couple progress over multiple weeks
- Historical context for current issues
- Data-driven insights into relationship patterns

## Benefits

1. **Accountability**: Visual tracking encourages consistent check-ins
2. **Progress Visibility**: Couples can see their growth over time
3. **Pattern Recognition**: Identify recurring issues or improvements
4. **Therapeutic Value**: Reflect on past challenges and successes
5. **Data Integrity**: ISO week standards ensure accurate tracking

## Future Enhancements

This foundation enables:

- Analytics dashboards with trend charts
- Automated insights based on historical patterns
- Email notifications for missed weeks
- Export functionality for therapist reports
- AI-powered pattern recognition

## Testing

To test the feature:

1. Create test users (see CREATE_TEST_USERS.md)
2. Submit weekly check-ins for different weeks
3. Visit `/checkin-history` to see the timeline
4. Verify week numbers are auto-calculated correctly
5. Check that trends show correctly (improving/declining)

---

**Status**: ✅ Complete and ready for production
**Database Update Required**: Yes - run `supabase-week-tracking-upgrade.sql`
