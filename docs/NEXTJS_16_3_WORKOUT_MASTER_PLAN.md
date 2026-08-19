# Next.js 16.3 Full-Stack Practice — Product and Learning Roadmap

> **Project:** Workout Video Platform  
> **Purpose:** A production-minded learning project for practicing Next.js 16.3 with Auth.js, Prisma ORM, Neon PostgreSQL, Server Components, Server Actions, caching, mutations, testing, and deployment.

> **Status:** Roadmap only. The repository currently provides the web
> foundation, shared UI library, Tailwind design system, Storybook workspace,
> monorepo tooling, and an initial Auth.js/Prisma authentication slice.
> Authentication is not yet production-ready. Database access beyond the
> initial User schema, workout domain
> features, and the full-stack flows below are planned work unless explicitly
> marked as implemented in the repository.

## Current implementation baseline

Implemented:

- Next.js 16.3 App Router application in `apps/web`.
- Shared compiled UI package in `packages/ui`.
- Tailwind CSS v4 design system in `packages/design-system`.
- Storybook component workspace in `apps/storybook`.
- pnpm/Turborepo task orchestration, linting, type checking, testing, CI, and
  package boundary checks.
- Auth.js Credentials provider with JWT sessions.
- Login, registration, protected `/home`, and route protection through
  `proxy.ts` plus a server-side application layout guard.
- Prisma User schema and bcrypt password hashing boundary.
- Focused authentication validation and authorization tests.

Planned:

- Production database migration and seed workflow against Neon PostgreSQL.
- Authentication recovery, verification, rate limiting, and browser E2E flow.
- Workout, coach, category, like, and favourite domain models.
- Onboarding, recommendations, search, pagination, and profile flows.
- Full integration and browser E2E coverage.

The phase definitions in this document describe the intended destination and
learning sequence. They are not a claim that those features already exist.

---

## 1. Project Overview

### Product concept

Build a small workout video platform where authenticated users can discover workout videos from coaches.

The user journey is:

```text
Landing
  ↓
Register / Login
  ↓
Onboarding
  ├── Select workout interests
  ├── Select experience level
  └── Complete onboarding
  ↓
Home
  ├── Recommended workout videos
  ├── Latest videos
  └── Categories
       ↓
    Video Detail
       ├── Like
       └── Favourite

Navigation
  ├── Home
  ├── Favourites
  └── Profile
```

The application should use **real database-backed data** rather than a mock-only frontend.

### Primary learning goal

This project is not intended to become a large production product.

It is a **Next.js 16.3 architecture playground** where each feature is intentionally designed to practice modern Next.js patterns and full-stack engineering.

---

# 2. Technology Stack

## Core

- Next.js 16.3
- React
- TypeScript
- App Router
- Tailwind CSS
- ESLint

## Authentication

- Auth.js
- Email/password authentication
- Session-based authentication

## Database

- PostgreSQL
- Neon Serverless PostgreSQL
- Prisma ORM

## Validation

Recommended:

- Zod

## Testing

Recommended:

- Vitest
- React Testing Library
- Playwright

## Deployment

- Vercel
- Neon

---

# 3. Product Scope

## P0 — MVP

The first working version must support:

### Authentication

- Register
- Login
- Logout
- Session handling
- Protected application routes

### Onboarding

- Select workout interests
- Select experience level
- Save onboarding preferences
- Mark onboarding as completed

### Home

- Display workout video list
- Display recommended videos
- Display latest videos
- Display coach information
- Display basic video metadata

### Video Detail

- View workout video information
- View coach
- View description
- View category
- Like video
- Favourite video

### Favourites

- Display user's favourite videos
- Remove a video from favourites

### Profile

- Display user information
- Display onboarding preferences
- Logout

---

# 4. P1 — Next.js Practice Features

After the MVP works:

- Loading states
- Error boundaries
- Not-found states
- Suspense
- Streaming
- Search
- URL search parameters
- Pagination
- Optimistic UI
- Server Actions
- Cache Components / `use cache`
- Cache invalidation
- Revalidation
- Navigation and prefetching
- Instant navigation
- Partial prefetching
- Dynamic metadata
- Route protection
- Server/client component boundaries

---

# 5. P2 — Engineering Quality

- Server-side validation
- Authorization
- Database constraints
- Transactions
- Error handling
- Accessibility
- Performance
- Security
- Unit tests
- Integration tests
- E2E tests
- Logging
- Observability
- Production deployment

---

# 6. UI / UX Flow

## 6.1 Landing

Route:

```text
/
```

Responsibilities:

- Explain the product
- CTA to Login
- CTA to Register

Unauthenticated users should not access the main application.

---

## 6.2 Register

Route:

```text
/register
```

Fields:

- Name
- Email
- Password
- Confirm password

States:

- Default
- Validation error
- Submission loading
- Server error
- Success

After successful registration:

```text
/register
    ↓
/onboarding
```

---

# 7. Authentication Flow

```text
Register
   ↓
Create User
   ↓
Create Auth Session
   ↓
Onboarding
   ↓
Complete Onboarding
   ↓
Home
```

Existing user:

```text
Login
   ↓
Auth Session
   ↓
Check onboardingCompleted
   ├── false → /onboarding
   └── true  → /home
```

Protected routes:

```text
/app/*
```

Unauthenticated access:

```text
/app/*
   ↓
/login
```

Authenticated but onboarding incomplete:

```text
/app/*
   ↓
/onboarding
```

---

# 8. Onboarding Flow

Route:

```text
/onboarding
```

## Step 1 — Workout Interests

Example:

- Strength
- Yoga
- Mobility
- HIIT
- Pilates
- Meditation
- Cardio
- Stretching

User can select multiple interests.

## Step 2 — Experience Level

Options:

- Beginner
- Intermediate
- Advanced

## Step 3 — Completion

Display a confirmation screen:

```text
You're ready to start!

[Start Working Out]
```

Then:

```text
/onboarding
    ↓
/home
```

---

# 9. Home UI

Route:

```text
/home
```

Conceptual layout:

```text
┌──────────────────────────────────────────────┐
│ WorkoutApp       Home  Favourites  Profile  │
├──────────────────────────────────────────────┤
│                                              │
│ Good morning, {name}                         │
│                                              │
│ Recommended for you                          │
│                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│ │ Thumbnail│ │ Thumbnail│ │ Thumbnail│       │
│ │          │ │          │ │          │       │
│ │ Coach    │ │ Coach    │ │ Coach    │       │
│ │ 30 min   │ │ 45 min   │ │ 20 min   │       │
│ │ ♥   ☆    │ │ ♥   ☆    │ │ ♥   ☆    │       │
│ └──────────┘ └──────────┘ └──────────┘       │
│                                              │
│ Latest Workouts                              │
│                                              │
│ ┌────────────────────────────────────────┐   │
│ │ Thumbnail │ Workout title              │   │
│ │           │ Coach • 30 min        ♥ ☆ │   │
│ └────────────────────────────────────────┘   │
│                                              │
└──────────────────────────────────────────────┘
```

## Home features

- Recommended workouts
- Latest workouts
- Workout categories
- Coach information
- Duration
- Difficulty
- Like count
- Favourite state
- Navigation to detail

---

# 10. Video Detail

Route:

```text
/items/[id]
```

Conceptual layout:

```text
← Back

┌──────────────────────────────────────┐
│                                      │
│           Video Thumbnail            │
│                                      │
└──────────────────────────────────────┘

30-Minute Full Body Workout

Coach: Jane Smith

Intermediate • Strength • 30 min

Description...

❤️ 124 likes

[ Like ]     [ ☆ Add to favourites ]
```

Responsibilities:

- Fetch item by ID
- Validate authorization where needed
- Return `notFound()` when the item does not exist
- Render metadata
- Support Like
- Support Favourite
- Revalidate relevant UI after mutation

---

# 11. Favourites

Route:

```text
/favourites
```

Display:

- User's favourite videos
- Coach
- Duration
- Difficulty
- Favourite state

Actions:

- Open video
- Remove favourite

Empty state:

```text
You haven't saved any workouts yet.

[Explore Workouts]
```

---

# 12. Profile

Route:

```text
/profile
```

Display:

- Name
- Email
- Experience level
- Workout interests

Actions:

- Edit preferences
- Logout

---

# 13. Domain Model

Initial domain:

```text
User
Coach
WorkoutVideo
Category
Interest
UserInterest
Like
Favourite
```

Relationships:

```text
User
 ├── UserInterest
 ├── Like
 └── Favourite

WorkoutVideo
 ├── Coach
 ├── Category
 ├── Like
 └── Favourite

Interest
 └── UserInterest
```

---

# 14. Database Design

## User

```text
User
- id
- name
- email
- passwordHash
- onboardingCompleted
- experienceLevel
- createdAt
- updatedAt
```

## Coach

```text
Coach
- id
- name
- slug
- bio
- avatarUrl
- createdAt
- updatedAt
```

## Category

```text
Category
- id
- name
- slug
```

## Interest

```text
Interest
- id
- name
- slug
```

## UserInterest

```text
UserInterest
- userId
- interestId
```

## WorkoutVideo

```text
WorkoutVideo
- id
- title
- slug
- description
- thumbnailUrl
- videoUrl
- durationSeconds
- difficulty
- coachId
- categoryId
- publishedAt
- createdAt
- updatedAt
```

## Like

```text
Like
- userId
- workoutVideoId
- createdAt
```

## Favourite

```text
Favourite
- userId
- workoutVideoId
- createdAt
```

---

# 15. Database Constraints

The database must enforce important invariants.

```text
User.email
    UNIQUE

UserInterest
    UNIQUE(userId, interestId)

Like
    UNIQUE(userId, workoutVideoId)

Favourite
    UNIQUE(userId, workoutVideoId)
```

The application should not rely only on frontend checks to prevent duplicate likes or favourites.

---

# 16. Recommended Project Structure

```text
src/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── onboarding/
│   │
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── home/
│   │   ├── items/
│   │   │   └── [id]/
│   │   ├── favourites/
│   │   └── profile/
│   │
│   ├── api/
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
│
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── workouts/
│   ├── favourites/
│   └── profile/
│
├── server/
│   ├── auth/
│   ├── users/
│   ├── workouts/
│   └── coaches/
│
├── db/
│   ├── prisma.ts
│   └── ...
│
├── lib/
│   ├── validation/
│   ├── errors/
│   └── utils/
│
└── types/
```

---

# 17. Architecture Principles

## Principle 1 — Server First

Default to Server Components.

Use Client Components only when client-side capabilities are required.

Examples:

```text
Server Component
- Fetch workout list
- Fetch user
- Fetch recommendations
- Render static content

Client Component
- Like button
- Favourite button
- Interactive filters
- Multi-step onboarding UI
```

---

# 18. Server / Client Boundary

Preferred:

```text
HomePage (Server)
      │
      ├── getRecommendedWorkouts()
      │
      └── WorkoutList
              │
              ├── WorkoutCard
              │
              └── FavouriteButton (Client)
```

Avoid:

```text
HomePage
   ↓
Client Component
   ↓
useEffect()
   ↓
/api/workouts
   ↓
Database
```

unless there is a concrete reason for client-side fetching.

---

# 19. Application Architecture

The application should separate presentation, application/domain logic, and persistence.

```text
┌──────────────────────────────┐
│            UI                │
│ App Router / Components      │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Application Layer      │
│ Server Actions / Services    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Data Access Layer      │
│            Prisma            │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      Neon PostgreSQL         │
└──────────────────────────────┘
```

UI components must not directly depend on Prisma.

---

# 20. Feature Architecture

Each major feature should own its business behavior.

Example:

```text
features/workouts/
├── components/
├── actions/
├── queries/
├── schemas/
├── types/
└── utils/
```

Possible flow:

```text
WorkoutCard
    ↓
FavouriteButton
    ↓
toggleFavouriteAction()
    ↓
favouriteService
    ↓
Prisma
```

---

# 21. Authentication Architecture

Authentication:

```text
UI
 ↓
Auth.js
 ↓
Session
 ↓
getCurrentUser()
```

Authorization:

```text
Request
 ↓
Authenticated User
 ↓
Check resource ownership / permission
 ↓
Mutation
```

Authentication and authorization must remain separate concepts.

---

# 22. Mutation Architecture

Example: Favourite

```text
User clicks Favourite
        ↓
Client Component
        ↓
Server Action
        ↓
Validate Session
        ↓
Validate Input
        ↓
Favourite Service
        ↓
Prisma
        ↓
Database Constraint
        ↓
Cache Invalidation / Revalidation
        ↓
Updated UI
```

The same pattern should be used for Like.

---

# 23. Validation Strategy

Use validation at the server boundary.

Example:

```text
Client Form
    ↓
Client validation
    ↓
Server Action
    ↓
Zod schema
    ↓
Business logic
```

Client validation is for UX.

Server validation is for correctness and security.

---

# 24. Data Fetching Strategy

Default:

```text
Server Component
    ↓
Server query
    ↓
Prisma
    ↓
Neon
```

Avoid unnecessary API routes between Server Components and the database.

Use Route Handlers only when there is a real HTTP boundary requirement.

---

# 25. Caching Strategy

Caching is a dedicated learning topic in this project.

We will explicitly experiment with:

- Static rendering
- Dynamic rendering
- `use cache`
- Cache Components
- Revalidation
- Cache invalidation
- Request memoization
- Navigation caching
- Prefetching

For every cache experiment, document:

```text
What is cached?
Who owns the cache?
When does it become stale?
How is it invalidated?
What happens after a mutation?
```

---

# 26. Next.js 16.3 Learning Lab

Create a dedicated documentation section:

```text
docs/nextjs-16.3/
```

Experiments:

### Experiment 01 — Server vs Client Components

Goal:

Understand exactly where the boundary should exist.

### Experiment 02 — Data Fetching

Compare:

```text
Server Component query
vs
Client fetch
```

### Experiment 03 — Suspense

Create slow workout/recommendation queries and observe streaming behavior.

### Experiment 04 — Loading UI

Implement:

```text
loading.tsx
```

### Experiment 05 — Error Boundaries

Implement:

```text
error.tsx
```

### Experiment 06 — Not Found

Implement:

```text
not-found.tsx
```

### Experiment 07 — Server Actions

Implement mutations with Server Actions.

### Experiment 08 — Optimistic UI

Like/Favourite without waiting for the complete server round-trip before updating the interaction state.

### Experiment 09 — Cache Components / `use cache`

Measure behavior before and after caching.

### Experiment 10 — Cache Invalidation

Observe what changes after Like/Favourite mutations.

### Experiment 11 — Prefetching

Observe route navigation and prefetched data.

### Experiment 12 — Instant Navigation

Measure perceived navigation latency.

### Experiment 13 — Partial Prefetching

Understand how partial route data can affect navigation performance.

### Experiment 14 — Dynamic Metadata

Generate metadata for:

```text
/items/[id]
```

---

# 27. Testing Strategy

## Unit Tests

Test:

- Validation schemas
- Pure business rules
- Utility functions

## Integration Tests

Test:

- Services
- Database operations
- Server Actions
- Authentication behavior

## E2E Tests

Primary flow:

```text
Register
 ↓
Onboarding
 ↓
Home
 ↓
Open Workout
 ↓
Like
 ↓
Favourite
 ↓
Favourites
 ↓
Remove Favourite
 ↓
Logout
```

---

# 28. Accessibility Requirements

Every major UI must support:

- Keyboard navigation
- Visible focus state
- Semantic HTML
- Labels for form controls
- Accessible buttons
- Meaningful image alt text
- Sufficient color contrast
- Screen-reader-friendly states
- Loading announcements where appropriate

Do not treat accessibility as a final polish step.

---

# 29. Performance Goals

Measure:

- Initial page load
- Navigation latency
- Database query latency
- Server rendering time
- Client JavaScript
- Image loading
- Interaction latency

Important principle:

> Do not optimize based on assumptions. Measure first.

---

# 30. Security Checklist

- Passwords must never be stored in plaintext.
- Authentication must be handled by the auth layer.
- Server Actions must validate the session.
- Server Actions must validate inputs.
- Authorization must happen server-side.
- Users must only modify their own Like/Favourite records.
- Database constraints must enforce uniqueness.
- Secrets must remain server-side.
- Environment variables must not be exposed to the client.
- Never trust IDs or state coming from the browser.

---

# 31. Development Phases

## Phase 0 — Foundation

**Status:** Foundation completed; database migration and seed workflow remain
planned.

Deliver:

- Next.js 16.3 project
- TypeScript
- Tailwind
- Prisma
- Neon connection
- Database schema
- Seed data
- Basic project structure
- Environment configuration

Definition of Done:

```text
npm run dev
    ↓
Application loads
    ↓
Prisma connects
    ↓
Neon works
    ↓
Seed data exists
```

---

## Phase 1 — Authentication

**Status:** Initial vertical slice implemented; hardening remains planned.

Deliver:

- Register
- Login
- Logout
- Session
- Protected routes

Implemented in the initial slice:

- Auth.js Credentials provider with JWT sessions
- Register and login pages backed by Server Actions
- Prisma `User` model with bcrypt password hashing
- `/home` protected by proxy and server-side layout authorization

Remaining before this phase is complete:

- Database migration and seed workflow
- Logout UI and session revocation strategy
- Rate limiting and account recovery/verification
- Integration and browser E2E coverage

Definition of Done:

```text
Anonymous → Login
Authenticated → Home/Onboarding
Logout → Login
```

---

## Phase 2 — Onboarding

Deliver:

- Interest selection
- Experience selection
- Persistence
- Redirect

Definition of Done:

```text
New user
 ↓
Onboarding
 ↓
Preferences saved
 ↓
Home
```

---

## Phase 3 — Workout Discovery

Deliver:

- Home
- Workout list
- Recommendation section
- Latest section
- Workout detail
- Coach information

Definition of Done:

```text
User can discover and open real DB-backed workouts.
```

---

## Phase 4 — Interaction

Deliver:

- Like
- Favourite
- Favourites page
- Optimistic interaction

Definition of Done:

```text
Like persists
Favourite persists
Duplicate records are impossible
UI reflects mutation
```

---

## Phase 5 — Next.js 16.3 Deep Dive

Deliver:

- Suspense
- Streaming
- Cache Components
- `use cache`
- Revalidation
- Server Actions
- Prefetching
- Instant Navigation
- Partial Prefetching
- Dynamic metadata

Definition of Done:

Each concept has:

```text
Implementation
+
Experiment
+
Observation
+
Documentation
```

---

## Phase 6 — Quality

Deliver:

- Unit tests
- Integration tests
- E2E tests
- Accessibility audit
- Performance audit
- Security review

---

## Phase 7 — Deployment

Deliver:

```text
GitHub
   ↓
Vercel
   ↓
Next.js 16.3
   ↓
Neon
```

Definition of Done:

- Production deployment works
- Database migrations work
- Environment variables are configured
- Authentication works in production
- E2E smoke test passes

---

# 32. Learning Contract

The goal is to learn, not simply generate code.

For every meaningful feature:

```text
1. Understand the requirement
2. Design the flow
3. Design the architecture
4. Implement
5. Test
6. Measure
7. Review
8. Refactor
9. Document what was learned
```

AI should primarily act as:

- Architecture reviewer
- Pair programmer
- Debugging assistant
- Code reviewer
- Documentation assistant

AI should not blindly generate the entire project without understanding the implementation.

---

# 33. Definition of Done — Feature

A feature is complete only when:

```text
[ ] UI implemented
[ ] Loading state implemented
[ ] Error state implemented
[ ] Empty state implemented where applicable
[ ] Server/client boundary reviewed
[ ] Server validation implemented
[ ] Authorization reviewed
[ ] Database constraints reviewed
[ ] Cache behavior understood
[ ] Tests added
[ ] Accessibility checked
[ ] Performance considered
[ ] Code reviewed
[ ] Learning notes documented
```

---

# 34. Definition of Done — Project

The project is complete when:

```text
[ ] Register works
[ ] Login works
[ ] Logout works
[ ] Protected routes work
[ ] Onboarding works
[ ] Workout list works
[ ] Workout detail works
[ ] Like works
[ ] Favourite works
[ ] Favourites works
[ ] Profile works
[ ] Loading/error/not-found states exist
[ ] Server/client boundaries are intentional
[ ] Server Actions are validated
[ ] Authorization is enforced
[ ] Prisma schema is production-minded
[ ] Neon deployment works
[ ] Unit tests exist
[ ] Integration tests exist
[ ] E2E flow passes
[ ] Accessibility reviewed
[ ] Performance reviewed
[ ] Security reviewed
[ ] Vercel deployment works
[ ] Next.js 16.3 experiments documented
```

---

# 35. Documentation Structure

Recommended repository structure:

```text
docs/
├── MASTER_PLAN.md
│
├── architecture/
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── AUTH.md
│   └── SERVER_CLIENT_BOUNDARY.md
│
├── nextjs-16.3/
│   ├── 01-server-client-components.md
│   ├── 02-data-fetching.md
│   ├── 03-suspense-streaming.md
│   ├── 04-server-actions.md
│   ├── 05-cache-components.md
│   ├── 06-cache-invalidation.md
│   ├── 07-prefetching.md
│   ├── 08-instant-navigation.md
│   └── 09-partial-prefetching.md
│
├── decisions/
│   └── ADR-001-project-architecture.md
│
└── learning-log/
    └── README.md
```

---

# 36. Suggested Git Strategy

Use small feature-oriented commits.

Example:

```text
feat(auth): add registration flow
feat(auth): add protected routes
feat(onboarding): add workout interests
feat(workouts): add workout list
feat(workouts): add workout detail
feat(workouts): add like action
feat(workouts): add favourite action
feat(favourites): add favourites page
test(workouts): add workout e2e flow
docs(nextjs): document cache components experiment
```

Avoid large commits such as:

```text
feat: build entire application
```

---

# 37. Architecture Review Questions

Before merging a feature, ask:

### Rendering

- Does this need a Client Component?
- Can this remain a Server Component?
- Where exactly is the client boundary?

### Data

- Where is data fetched?
- Is an API route actually necessary?
- Can the server query the database directly?

### Mutation

- Is this mutation server-side?
- Is authentication checked?
- Is authorization checked?
- Is input validated?

### Database

- Are unique constraints correct?
- Can duplicate state occur?
- Is a transaction required?

### Cache

- Is this data cached?
- Should it be cached?
- When does it become stale?
- How is it invalidated?

### UX

- What happens while loading?
- What happens on error?
- What happens when there is no data?
- What happens on slow networks?

### Performance

- Are we fetching unnecessary data?
- Are we creating waterfalls?
- Are we sending unnecessary JavaScript to the browser?

---

# 38. Initial Seed Data

The project should start with realistic data.

Example coaches:

```text
Jane Smith
Michael Chen
Sarah Johnson
David Lee
```

Example categories:

```text
Strength
Yoga
Mobility
HIIT
Pilates
Cardio
Stretching
Meditation
```

Example workout videos:

```text
30-Minute Full Body Strength
Morning Mobility Flow
Beginner HIIT
Core Strength Fundamentals
Evening Yoga Reset
Full Body Stretch
Advanced Cardio Blast
Recovery & Mobility
```

Seed enough data to make:

- List rendering meaningful
- Recommendations meaningful
- Pagination meaningful
- Search meaningful
- Favourite state meaningful

---

# 39. Recommendation Logic — MVP

Do not build an AI recommendation engine.

Use a deterministic rule:

```text
User Interests
       ↓
Workout Category
       ↓
Matching workouts
       ↓
Order by popularity / publishedAt
```

Example:

```text
User interests:
Yoga
Mobility

Recommended:
Yoga videos
Mobility videos
```

Later, this can become an experiment for more advanced recommendation architecture.

---

# 40. Future Extensions

Not part of MVP:

- Video player
- Watch history
- Progress tracking
- Workout completion
- Ratings
- Comments
- Coach profiles
- Subscription
- Payments
- Admin dashboard
- Content management
- Personalized recommendation engine
- Search engine
- Notifications
- Social features

These should remain outside the initial scope unless needed for a specific Next.js experiment.

---

# 41. Success Criteria

This project is successful if, after completing it, we can confidently explain:

### Next.js

- Why a component is Server or Client
- How App Router rendering works
- How data fetching works
- How Server Actions work
- How streaming works
- How Suspense works
- How caching works
- How `use cache` works
- How cache invalidation works
- How prefetching works
- How Instant Navigation works
- How Partial Prefetching works
- How route protection works

### Backend

- How Auth.js integrates with the application
- How Prisma models the domain
- How Neon works with a serverless application
- How transactions work
- How database constraints protect invariants
- How authorization is enforced

### Architecture

- How to design Server/Client boundaries
- How to structure feature modules
- How to isolate persistence from UI
- How to design mutations
- How to handle errors
- How to test the full user journey
- How to deploy the architecture to Vercel + Neon

---

# 42. Final Target Architecture

```text
                         ┌───────────────────────┐
                         │       Browser         │
                         │                       │
                         │ React Client          │
                         │ Components            │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      Next.js 16.3     │
                         │      App Router       │
                         │                       │
                         │ Server Components     │
                         │ Client Components     │
                         │ Server Actions        │
                         │ Proxy                 │
                         │ Cache Components      │
                         └───────────┬───────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
           ┌─────────────────┐              ┌─────────────────┐
           │     Auth.js     │              │ Application /   │
           │                 │              │ Domain Services │
           └─────────────────┘              └────────┬────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │ Prisma ORM      │
                                            └────────┬────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │ Neon PostgreSQL │
                                            └─────────────────┘
```

---

# 43. First Implementation Milestone

Do not implement the entire application at once.

Start with:

```text
PHASE 0

1. Create Next.js 16.3 application
2. Configure TypeScript
3. Configure Tailwind
4. Configure Prisma
5. Create Neon database
6. Configure environment variables
7. Create initial Prisma schema
8. Create migration
9. Create seed script
10. Verify DB connection
11. Establish project folder structure
12. Commit baseline
```

Then move to:

```text
PHASE 1 — AUTH
```

The architecture should be reviewed before implementation proceeds to the next phase.

---

# 44. Project Principle

> **Build a small product, but practice production-grade engineering.**

The application should remain small enough to understand completely while deliberately exposing the important architectural problems of a modern Next.js application:

```text
Rendering
Data Fetching
Mutations
Authentication
Authorization
Caching
Database
Server/Client Boundaries
Performance
Testing
Deployment
```

This is the primary purpose of the project.
