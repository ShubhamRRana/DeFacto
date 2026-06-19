# DeFacto Quiz Feature

Documentation for the quiz system implemented in DeFacto.

## Overview

The quiz feature adds a fourth bottom tab (**Quizzes**) where users can:

- Pick a topic and start a quiz (5–30 questions, in steps of 5)
- Choose difficulty (Easy / Medium / Hard)
- Answer MCQ and True/False questions with end-of-round scoring
- Compete on weekly global and per-topic leaderboards
- Earn badges and maintain a separate daily quiz streak
- Create and publish questions to a shared pool (including from bookmarks)

## Architecture

```
Quizzes Tab (QuizHomeScreen)
  ├── Topic picker → SessionConfigSheet (length, difficulty, bookmarks toggle)
  ├── QuizPlayScreen (stack) → QuizResultsScreen (stack)
  ├── CreateQuestionScreen (stack modal)
  └── LeaderboardScreen (stack modal)

Backend
  ├── generate-quiz (edge function) — on-demand question generation
  ├── submit_quiz_session (RPC) — server-side grading + gamification
  ├── create_quiz_question (RPC) — user-created shared questions
  └── get_weekly_leaderboard / get_user_quiz_rank (RPCs)
```

## Database Tables

| Table | Purpose |
|---|---|
| `quiz_questions` | Shared question pool per topic |
| `quiz_sessions` | User quiz sessions |
| `quiz_session_questions` | Questions assigned to a session |
| `quiz_answers` | User answers per session |
| `user_badges` | Earned badge keys |
| `quiz_leaderboard_weekly` | Weekly global + per-topic scores |
| `quiz_topic_stats` | Cumulative correct answers per topic |

Profile columns added: `quiz_streak_count`, `quiz_last_active_date`.

## Composite Score Formula

```
composite = correct_count
          × difficulty_multiplier   (easy=1, medium=1.5, hard=2)
          × speed_bonus             (avg < 5s → 1.2, < 10s → 1.0, else 0.8)
          × length_bonus            (5 → 0.8, scales linearly to 30 → 1.3)
```

Minimum 500ms per question enforced server-side (anti-gaming).

## Badges (v1)

| Key | Trigger |
|---|---|
| `first_quiz` | Complete any quiz |
| `perfect_10` | Score 10/10 on a 10-question round |
| `topic_master` | 50 cumulative correct in one topic |
| `streak_7` | 7-day quiz streak |
| `contributor` | Publish 5+ user-created questions |
| `top_10` | Finish week in global top 10 |

## Question Sources

1. **AI-generated** — `generate-quiz` edge function creates questions from facts on session start
2. **User-created** — manual Q&A via `CreateQuestionScreen`
3. **Bookmark-seeded** — user picks a bookmarked fact as seed when creating a question

All questions go into the **shared pool** for the topic.

## Session Flow

1. User picks topic + config on `QuizHomeScreen`
2. `generate-quiz` runs:
   - Rate limit: max 10 sessions/hour per user
   - If facts < 5 for topic → generates facts first
   - Pulls unseen questions from pool; generates remainder via OpenAI
   - Creates session with status `active`; returns questions **without** `correct_answer`
3. User answers all questions (no per-question feedback)
4. `submit_quiz_session` RPC grades answers, updates streak, leaderboard, badges
5. `QuizResultsScreen` shows score, composite points, missed questions, new badges

## Frontend Files

```
src/
  hooks/useQuiz.js          # QuizProvider + useQuiz context
  utils/quiz.js             # API helpers + badge definitions
  screens/
    QuizHomeScreen.js
    QuizPlayScreen.js
    QuizResultsScreen.js
    LeaderboardScreen.js
    CreateQuestionScreen.js
  components/
    QuizQuestionCard.js
    QuizOptionButton.js
    QuizProgressBar.js
    BadgeGrid.js
    LeaderboardRow.js
    SessionConfigSheet.js
  navigation/AppNavigator.js  # Quizzes tab + stack screens

supabase/
  migrations/
    20260619100000_add_quiz_tables.sql
    20260619110000_add_quiz_rpcs.sql
    20260619130000_extend_quiz_question_counts.sql
  functions/generate-quiz/index.ts
```

## Migrations Applied

Migrations are in the repo and were applied to the DeFacto Supabase project (`bfcefrlnitlqmzerucok`). The `generate-quiz` edge function was deployed via Supabase CLI.

## Future Scope (deferred)

- **Friends leaderboard** — requires social graph (follow/invite system)
- **Report question** — flag low-quality user questions in shared pool
- **Question edit/delete** — allow contributors to manage their questions
- **Practice mode** — retakes that don't affect leaderboard
- **Rabbit hole tie-in** — "Quiz this topic" from feed drill-down
- **Daily free quiz limit** — cost control for OpenAI generation
- **Offline quizzes** — cached question packs
- **Top 10 badge scope** — per-topic vs global (currently global weekly)
- **Weekly reset timezone** — currently UTC Monday-based week

## Open Questions (from planning)

1. Top 10 badge: global only or also per-topic?
2. Weekly reset: UTC or user local midnight?
3. Can users edit/delete contributed questions?
4. Allow practice retakes without leaderboard impact?
5. Auto-generate T/F from bookmarks vs manual only?
6. Daily generation cost cap?

## Testing Checklist

- [ ] Start quiz from each topic with 5/10/15/20/25/30 questions via config sheet stepper
- [ ] Verify config sheet: stepper bounds, difficulty segments, time estimate, bookmark toggle
- [ ] Cancel config sheet via backdrop tap or Cancel without starting quiz
- [ ] Verify loading state during AI generation
- [ ] Cancel quiz mid-session
- [ ] Complete quiz and verify results summary
- [ ] Create MCQ and T/F questions manually
- [ ] Seed question from bookmark
- [ ] View global and per-topic leaderboards
- [ ] Verify quiz streak increments on consecutive days
- [ ] Verify badges unlock (first_quiz at minimum)
- [ ] Profile shows quiz streak and badge grid
