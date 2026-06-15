# Proposed Features & Improvements

This document outlines proposed features and improvements for the Train with Joe vocabulary training app. Each feature includes a description, rationale, estimated effort, priority level, and relevant technical notes.

---

## Table of Contents

1. [Leaderboard / Classroom Mode](#1-leaderboard--classroom-mode)
2. [Parent Dashboard](#2-parent-dashboard)
3. [Audio Pronunciation](#3-audio-pronunciation)
4. [Daily Challenge Mode](#4-daily-challenge-mode)
5. [Vocabulary Games](#5-vocabulary-games)
6. [Adaptive Difficulty](#6-adaptive-difficulty)
7. [Offline Mode](#7-offline-mode)
8. [Textbook Import](#8-textbook-import)
9. [Social Sharing](#9-social-sharing)
10. [Play Store Receipt Validation](#10-play-store-receipt-validation)

---

## 1. Leaderboard / Classroom Mode

**Priority:** High  
**Effort:** High  
**Value:** High

### Description

Teachers create virtual classrooms and invite students via a join code. Students see anonymized leaderboards displaying streaks, mastery progress, and weekly activity. Teachers get a dashboard to monitor individual and class-wide performance.

### Rationale

Classrooms are a major acquisition channel for educational apps targeting children. Providing teacher tools makes the app adoptable at the school level rather than relying solely on individual parents. Leaderboards leverage social motivation, which is especially effective for younger learners.

### Technical Notes

- New DynamoDB table for classroom membership (partition key: `classroomId`, sort key: `userId`)
- AppSync resolver to aggregate anonymized leaderboard data
- Teacher role added to Cognito user groups
- Privacy-first design: leaderboard shows display names only, no PII exposed to other students
- Consider a weekly batch Lambda to compute leaderboard snapshots (avoids expensive real-time aggregation)

---

## 2. Parent Dashboard

**Priority:** High  
**Effort:** Medium  
**Value:** High

### Description

Weekly progress reports delivered via email (Amazon SES) showing the child's streak status, number of mastered words, time spent training, and a summary of areas that need attention.

### Rationale

Parents of younger children want visibility into progress without needing to open the app daily. Automated email reports keep parents engaged and reduce churn, especially for paying subscribers.

### Technical Notes

- EventBridge scheduled rule triggering a Lambda every Sunday
- SES email template with responsive HTML (supports major email clients)
- Data aggregated from existing training history and the new SRS mastery records
- Opt-in preference stored on the user profile (`parentEmail`, `weeklyReportEnabled`)
- Respect COPPA requirements: parent email collected during onboarding, not from the child

---

## 3. Audio Pronunciation

**Priority:** Medium  
**Effort:** Medium  
**Value:** Medium

### Description

Use Amazon Polly to generate native-language pronunciation for every vocabulary word. Users tap a speaker icon to hear the word spoken aloud in the target language.

### Rationale

Pronunciation is a critical component of language learning, especially for children who are still developing reading skills. Audio reinforcement improves retention and helps learners self-correct.

### Technical Notes

- Amazon Polly supports all 6 app languages (DE, EN, FR, ES, IT, PT)
- Pre-generate audio at vocabulary-list creation time and store MP3 files in S3
- Alternatively, generate on-demand with a short Lambda and cache in S3 (lower storage cost, slightly higher latency on first play)
- Flutter `audioplayers` package for client-side playback
- Estimated Polly cost: negligible at current word volumes (standard voices are $4/1M characters)

---

## 4. Daily Challenge Mode

**Priority:** Medium  
**Effort:** Low  
**Value:** Medium

### Description

A fixed daily set of mixed exercises drawn from all of a user's vocabulary lists, refreshed every 24 hours. Completing the daily challenge extends the user's streak and awards bonus XP.

### Rationale

Daily challenges create a recurring engagement hook with minimal friction. They expose learners to a cross-section of their vocabulary, reinforcing spaced repetition naturally. The low implementation effort makes this a strong quick win.

### Technical Notes

- Seed a deterministic daily selection using `userId + date` as a hash key (ensures consistency if the user retries)
- Reuse existing exercise generation (Bedrock) with a "mixed" mode flag
- Integrate with the streak system: daily challenge completion counts as a training session
- UI: dedicated "Daily Challenge" card on the home screen with a countdown timer to next refresh

---

## 5. Vocabulary Games

**Priority:** High  
**Effort:** High  
**Value:** High

### Description

Interactive game modes including word matching (memory cards), hangman, and word search puzzles. Games use the learner's own vocabulary lists and adapt to their proficiency level.

### Rationale

Younger children (ages 6-10) learn most effectively through play. Gamified exercises increase session length and voluntary return rates. Vocabulary games differentiate the app from competitors that rely solely on flashcard-style drilling.

### Technical Notes

- Flutter game widgets (consider the `flame` package for more complex interactions)
- Memory card game: pairs of word + translation, randomized grid
- Hangman: select word from due-for-review list, animate letter reveals
- Word search: generate grid via a backtracking algorithm, highlight found words
- All games feed results back into the SRS system (correct answers advance the Leitner box)
- Significant UI/UX design effort required for age-appropriate interactions

---

## 6. Adaptive Difficulty

**Priority:** Medium  
**Effort:** Medium  
**Value:** Medium

### Description

Automatically adjust word selection difficulty (easy/medium/hard) based on the learner's SRS mastery performance. Learners who master words quickly receive harder content sooner; those who struggle get additional reinforcement at the current level.

### Rationale

One-size-fits-all difficulty leads to boredom (too easy) or frustration (too hard). Adaptive difficulty keeps learners in the optimal challenge zone, improving both retention and engagement.

### Technical Notes

- Leverage existing SRS box progression data: words stuck in boxes 1-2 indicate difficulty, words advancing quickly indicate readiness
- Difficulty tiers can map to word frequency (common words = easy, less frequent = hard)
- Algorithm: weighted random selection biased toward the learner's current edge of competence
- No additional infrastructure needed; logic lives in the training session creation Lambda
- Consider A/B testing the algorithm against fixed-difficulty control groups

---

## 7. Offline Mode

**Priority:** Medium  
**Effort:** Medium  
**Value:** Medium

### Description

Cache vocabulary lists and training state locally so learners can continue practicing without an internet connection. Sync changes back to the server when connectivity is restored.

### Rationale

Children often use tablets during travel or in areas with unreliable connectivity. Offline support removes a barrier to consistent daily practice, directly supporting streak maintenance.

### Technical Notes

- Flutter `hive` or `sqflite` for local storage of vocabulary and training state
- Optimistic UI: allow training sessions offline, queue results for sync
- Conflict resolution strategy: last-write-wins with timestamp comparison (acceptable given single-user-per-device model)
- Sync queue processed on app foreground + connectivity change events
- SRS box state must be merged carefully to avoid regression (always take the higher box value)
- Initial download of vocabulary lists should be triggered proactively when on WiFi

---

## 8. Textbook Import

**Priority:** Low  
**Effort:** Low  
**Value:** Low

### Description

Structured import of vocabulary from common textbook publishers via ISBN-based lookup. Users scan a textbook barcode, and the app loads the corresponding vocabulary list (if available in the database).

### Rationale

Reduces friction for families who want the app to complement schoolwork. Children studying from a specific textbook can immediately practice the relevant vocabulary without manual entry.

### Technical Notes

- ISBN lookup via Open Library API or a curated internal mapping table
- Vocabulary lists mapped to textbook chapters stored in DynamoDB (partition key: ISBN, sort key: chapter)
- Community contribution model: teachers can submit vocabulary-to-ISBN mappings for approval
- Barcode scanning already partially supported by the image analysis feature (camera access exists)
- Limited initial coverage is acceptable; focus on top 10 textbooks per supported language

---

## 9. Social Sharing

**Priority:** Medium  
**Effort:** Low  
**Value:** Medium

### Description

Share achievement badges and streak milestones via social platforms using the existing `profile_cards` Angular micro-app to generate shareable card images.

### Rationale

Word-of-mouth is the strongest growth channel for educational apps. Shareable achievements turn engaged users into ambassadors. The existing profile cards infrastructure minimizes implementation effort.

### Technical Notes

- `profile_cards` Angular app already generates styled card images; extend with achievement/streak templates
- Generate a shareable URL per card (hosted on the existing CloudFront distribution)
- Flutter share sheet integration via `share_plus` package
- Open Graph meta tags on the card URL for rich previews on social platforms
- Privacy consideration: cards show only the child's display name and achievement, no PII

---

## 10. Play Store Receipt Validation

**Priority:** High  
**Effort:** Medium  
**Value:** High

### Description

Implement server-side Google Play receipt validation using the Google Play Developer API, replacing the current mock/TODO implementation in the payment service.

### Rationale

Without proper receipt validation, the app is vulnerable to forged purchase receipts and cannot reliably manage subscription lifecycle events (renewals, cancellations, grace periods). This is a prerequisite for sustainable revenue on Android.

### Technical Notes

- Current implementation in `payment-service.ts` has a TODO placeholder for Google Play validation
- Use the Google Play Developer API v3 (`purchases.subscriptions.get` and `purchases.products.get`)
- Service account credentials stored in AWS Secrets Manager
- Implement Real-time Developer Notifications (RTDN) via Cloud Pub/Sub forwarded to an SNS topic for lifecycle events
- Handle edge cases: grace period, account hold, pause, and revocation states
- Mirror the existing Apple App Store validation pattern for consistency
- Add integration tests with Google's test purchase sandbox

---

## Implementation Priority Matrix

| Feature | Value | Effort | Priority Score |
|---------|-------|--------|----------------|
| Leaderboard / Classroom Mode | High | High | Strategic |
| Parent Dashboard | High | Medium | High |
| Play Store Receipt Validation | High | Medium | High |
| Vocabulary Games | High | High | Strategic |
| Daily Challenge Mode | Medium | Low | Quick Win |
| Social Sharing | Medium | Low | Quick Win |
| Audio Pronunciation | Medium | Medium | Medium |
| Adaptive Difficulty | Medium | Medium | Medium |
| Offline Mode | Medium | Medium | Medium |
| Textbook Import | Low | Low | Low |

### Recommended Implementation Order

1. **Quick Wins (Sprint 1-2):** Daily Challenge Mode, Social Sharing
2. **High Priority (Sprint 3-5):** Play Store Receipt Validation, Parent Dashboard
3. **Medium Priority (Sprint 6-8):** Audio Pronunciation, Adaptive Difficulty, Offline Mode
4. **Strategic (Sprint 9+):** Vocabulary Games, Leaderboard / Classroom Mode
5. **Backlog:** Textbook Import

---

*Last updated: January 2025*
