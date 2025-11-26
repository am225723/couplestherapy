# Therapist Management System Implementation

This document outlines the comprehensive therapist management system that has been implemented in the couples therapy platform.

## Overview

The therapist management system provides administrators and therapists with the ability to:

- Create new couples with partner accounts
- Create new therapist accounts
- Manage therapist-couple relationships
- Generate and manage join codes for couples
- View and link unassigned couples

## Database Schema

### New Tables Added

1. **Couples_voice_memos** - Voice messages between partners
2. **Couples_messages** - Text messaging system
3. **Couples_calendar_events** - Shared calendar for therapy sessions and dates
4. **Couples_love_map_questions** - Love Map quiz questions
5. **Couples_love_map_sessions** - Love Map quiz sessions
6. **Couples_love_map_truths** - Partner's self-answers
7. **Couples_love_map_guesses** - Partner's guesses about each other

### Enhanced Tables

- **Couples_couples** - Added `join_code` column for easy couple linking

## API Endpoints

### Couple Management

- `POST /api/therapist/create-couple` - Create new couple with both partners
- `GET /api/therapist/my-couples` - Get all couples assigned to current therapist
- `GET /api/therapist/unassigned-couples` - Get couples without therapist assignment
- `POST /api/therapist/link-couple` - Link unassigned couple to therapist
- `POST /api/therapist/regenerate-join-code` - Generate new join code for couple

### Therapist Management

- `POST /api/therapist/create-therapist` - Create new therapist account

### Existing Features Enhanced

- All existing therapist endpoints now use proper authentication
- Voice memos, messages, calendar, and love map endpoints integrated
- Row Level Security (RLS) policies for all new tables

## Frontend Components

### New Pages

- `/admin/therapist-management` - Comprehensive therapist management interface

### Features

1. **Couple Creation**

   - Create both partner accounts simultaneously
   - Automatic couple assignment to creating therapist
   - Generate unique join codes

2. **Therapist Creation** (Admin only)

   - Create new therapist accounts
   - Automatic role assignment

3. **Couple Management**

   - View assigned couples with partner names
   - Regenerate join codes
   - Link unassigned couples
   - Navigate to detailed couple views

4. **User Interface**
   - Tabbed interface for different management sections
   - Responsive design with cards and badges
   - Form validation and error handling
   - Loading states and success notifications

## Security Features

### Authentication

- All therapist endpoints require authentication
- Role-based access control (therapist/admin only)
- Session verification using Supabase auth

### Row Level Security (RLS)

- Therapists can only access their assigned couples
- Admins can access all data
- Couples can only access their own data
- Privacy controls for sensitive information (e.g., voice memo transcripts)

## Installation & Setup

### Database Migration

Run the migration script to add new tables and update existing ones:

```sql
-- Run in Supabase SQL Editor
-- File: supabase-therapist-management-migration.sql
```

### Environment Variables

Ensure these are configured in your environment:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations
- `PERPLEXITY_API_KEY` - For AI-powered insights (optional)

## User Workflow

### Creating a New Couple

1. Navigate to `/admin/therapist-management`
2. Click "Create Couple"
3. Fill in partner details (name, email, password for both)
4. Submit - creates accounts and assigns to therapist
5. Share join code with couple for easy access

### Managing Existing Couples

1. View "My Couples" tab to see assigned couples
2. Click "View Details" to see comprehensive couple data
3. Use "Regenerate Join Code" if needed
4. Access unassigned couples from "Unassigned Couples" tab

### Creating Therapists (Admin Only)

1. Navigate to "Therapists" tab
2. Click "Create Therapist"
3. Fill in therapist details
4. Submit - creates therapist account

## Integration Points

The therapist management system integrates with:

- **Authentication System** - Supabase Auth for user management
- **Analytics Dashboard** - Couple data for therapist insights
- **Messaging System** - Therapist-client communication
- **Calendar System** - Session scheduling
- **Voice Memo System** - Private voice messages
- **Love Map System** - Relationship assessment tools

## Future Enhancements

Potential improvements for future versions:

1. **Bulk Operations** - Import couples from CSV
2. **Therapist Scheduling** - Manage therapist availability
3. **Automated Onboarding** - Welcome emails and tutorials
4. **Advanced Analytics** - Progress tracking and outcomes
5. **Multi-tenant Support** - Therapy practice management
6. **Integration Calendar** - Sync with external calendars

## Troubleshooting

### Common Issues

1. **Permission Errors** - Verify RLS policies are correctly applied
2. **Missing Data** - Check database migration completed successfully
3. **Authentication Failures** - Ensure proper Supabase configuration
4. **Join Code Issues** - Regenerate codes if problems occur

### Debug Steps

1. Check browser console for JavaScript errors
2. Verify Supabase logs for database errors
3. Test API endpoints directly
4. Check user role assignments in profiles table

## Support

For issues or questions regarding the therapist management system:

1. Review this documentation
2. Check the database migration scripts
3. Verify Supabase configuration
4. Test with fresh data if needed
