

# Hindustan AI - Indian News & Community Platform

## Overview
A modern, clean & minimal Indian news aggregation app powered by RSS feeds, with community engagement features, Google authentication, and bilingual support (English + Hindi).

## Pages & Features

### 1. **Home / News Feed**
- Clean card-based layout showing latest news from Indian sources (NDTV, Times of India, The Hindu, India Today, Hindustan Times)
- Category tabs: Politics, Sports, Technology, Business, Entertainment, World (India relations)
- Each card: thumbnail, headline, source, time, like count, comment count
- Pull-to-refresh style loading, infinite scroll
- "Hindustan AI" branding with Indian-themed accent

### 2. **News Detail Page**
- Full article view with RSS content
- Like button (heart), comment section below
- Related news suggestions
- Share button disabled with tooltip "Sharing is not available"
- Source attribution and link to original

### 3. **Authentication (Google + Email)**
- Google OAuth sign-in via Supabase
- Email/password with verification
- Profile setup after first login (name, avatar, preferred language)

### 4. **Community Hub (Support & Protest)**
- **Trending Issues** — vote-based cards showing live Support vs Protest counts with progress bars
- **Petitions** — users can create petitions with title, description, target goal; others sign them
- Filter: Active, Completed, My Petitions
- Each issue/petition shows engagement metrics

### 5. **User Interactions**
- Like/unlike news articles
- Comment on articles (threaded replies)
- Upvote/downvote comments
- No sharing functionality (by design)

### 6. **Language Toggle**
- Switch between English and Hindi UI
- Persisted in user preferences

## 5 Additional Features (My Choice)

1. **Bookmarks** — Save articles to read later, accessible from profile
2. **Trending Section** — Top 10 most-liked/commented articles of the day
3. **Dark/Light Mode Toggle** — User preference for theme
4. **News Categories & Filters** — Filter by source, category, date range
5. **User Profile & Activity** — View your likes, comments, bookmarks, petitions, and community activity

## Backend (Supabase via Lovable Cloud)
- **Tables**: profiles, articles (cached RSS), likes, comments, community_issues, petitions, petition_signatures, bookmarks, user_roles
- **Edge Function**: RSS feed fetcher that pulls from Indian news RSS feeds periodically
- **RLS**: Users can only edit their own content; public read for articles/issues
- **Auth**: Google OAuth + Email/Password with verification

## Design
- Clean white background, subtle gray cards
- Primary accent: deep blue (#1a365d) with saffron (#FF9933) highlights
- Modern sans-serif typography
- Responsive: mobile-first design
- Bottom navigation on mobile, sidebar on desktop

## Tech
- React + Tailwind + shadcn/ui
- Supabase (Lovable Cloud) for auth, database, edge functions
- RSS parsing via edge function (no external API needed)
- Real-time updates for likes/comments via Supabase subscriptions

