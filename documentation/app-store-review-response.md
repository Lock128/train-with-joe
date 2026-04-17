# App Store Review — Response & Fixes

Date: April 17, 2026

This document summarizes the App Store review rejection, the changes made to address each guideline, and the remaining manual steps required before resubmission.

---

## Guideline 2.3.10 — Accurate Metadata (Android References)

**Issue:** The store listing contained references to Android and third-party platforms not relevant to App Store users.

**Fix:** Updated `documentation/store-listing.md`:
- Removed "Play Store" from the short description header
- Changed "Full Description (App Store & Play Store)" → "Full Description (App Store)"
- Removed "Works on iOS, Android, and web" from the features list
- Added "Delete your account and all associated data at any time from the app" to features (also relevant for Guideline 5.1.1(v))

**Files changed:**
- `documentation/store-listing.md`

---

## Guideline 5.1.1(v) — Account Deletion

**Issue:** The app supports account creation but does not offer account deletion.

**Fix:** Implemented full account deletion flow, end to end.

**Backend:**
- Added `deleteUser` mutation to the GraphQL schema (`schema.graphql`)
- Created `Mutation.deleteUser.ts` Lambda resolver that cascading-deletes all user data:
  - User record (DynamoDB)
  - Subscription records
  - All vocabulary lists
  - All trainings and executions
  - Usage counters
  - Cognito user pool entry (via `AdminDeleteUser`)
- Wired the Lambda into `api-stack.ts` with read/write grants on all 5 DynamoDB tables and `cognito-idp:AdminDeleteUser` IAM permission

**Frontend:**
- Added "Delete Account" button (red, outlined) to the Info screen below the Sign Out button
- Two-step confirmation: first a standard confirmation dialog, then a "type DELETE" dialog
- After successful deletion, the user is signed out and redirected to the sign-in screen
- Loading state shown during the deletion API call

**Localization:**
- Added 5 new strings (`deleteAccount`, `deleteAccountConfirm`, `deleteAccountFinalConfirm`, `deleteAccountTypeDelete`, `deleteAccountFailed`) to all 6 ARB files (EN, DE, ES, FR, JA, PT)

**Files changed:**
- `backend/src/gql-schemas/schema.graphql`
- `backend/src/gql-lambda-functions/Mutation.deleteUser.ts` (new)
- `backend/lib/api-stack.ts`
- `frontend/src/lib/screens/info_screen.dart`
- `frontend/src/lib/l10n/app_en.arb`, `app_de.arb`, `app_es.arb`, `app_fr.arb`, `app_ja.arb`, `app_pt.arb`

---

## Guideline 1.3 — Kids Category (Parental Gate)

**Issue:** The app is in the Kids category but allows access to external content and commerce without parental permission.

**Fix:** Implemented a parental gate dialog that presents an adult-level math task (two-digit multiplication, e.g. "14 × 7 = ?"), consistent with Apple's documented requirements at https://developer.apple.com/app-store/parental-gates/.

The gate is shown before:
- Opening any external URL (Privacy Policy, Terms of Service, Contact Us mailto link) on the Info screen
- Opening Terms of Service / Privacy Policy links on the Subscription screen
- Initiating any In-App Purchase on the Subscription screen

Design details:
- Multiplication problems (11–25 × 4–9) — well beyond the ability of children in Kids category age bands (5 and under, 6–8, 9–11), trivial for adults
- 3-attempt cooldown (5 seconds) to prevent brute-force guessing
- New problem generated on each wrong answer
- Fully localized across all 6 languages
- Lock icon and "Grown-Ups Only" title make it clear this is a parent-facing gate

**Note on iOS/Play Store native mechanisms:** Apple's "Ask to Buy" (Family Sharing) automatically intercepts IAP transactions on child accounts at the OS level — no app code needed. The parental gate we implemented is the in-app gate that Guideline 1.3 explicitly requires on top of that.

**Files changed:**
- `frontend/src/lib/widgets/parental_gate_dialog.dart` (new)
- `frontend/src/lib/screens/info_screen.dart`
- `frontend/src/lib/screens/subscription_screen.dart`
- `frontend/src/lib/l10n/app_en.arb`, `app_de.arb`, `app_es.arb`, `app_fr.arb`, `app_ja.arb`, `app_pt.arb`

---

## Guideline 2.1 — Information Needed (Privacy & Data Collection)

**Issue:** Apple requested detailed answers about analytics, advertising, data sharing, and data collection.

**Fix:** Added a "Privacy & Data Collection" section to the App Store review notes in `documentation/store-listing.md` with the following answers:

- **Third-party analytics:** None. No Firebase, Amplitude, or other analytics SDKs.
- **Third-party advertising:** None.
- **Data sharing:** No user data is shared with third parties.
- **Data collection:** Only what's needed for core functionality — email for authentication (AWS Cognito), vocabulary lists, training progress, and subscription status. All stored in AWS (DynamoDB, S3).

These answers should be copied into the App Store Connect reply to the review team.

**Files changed:**
- `documentation/store-listing.md`

---

## Guideline 2.1(b) — IAP Products Not Submitted

**Issue:** The app references subscriptions but the associated In-App Purchase products were not submitted for review.

**Fix:** This is NOT a code issue. It requires manual action in App Store Connect:

1. Go to App Store Connect → Your App → In-App Purchases
2. Create the subscription products (Basic and Pro plans) if not already created
3. Add the required App Review screenshot for each IAP product
4. Submit the IAP products for review alongside the new binary

No code changes were needed for this guideline.

---

## Manual Steps Before Resubmission

1. **App Store Connect — IAP:** Submit the In-App Purchase subscription products for review with screenshots (Guideline 2.1(b))
2. **App Store Connect — Metadata:** Update the App Store description to match the revised `documentation/store-listing.md` (remove Android references)
3. **App Store Connect — Review Notes:** Copy the updated review notes (including privacy answers and parental gate / account deletion instructions) into the App Review Information section
4. **App Store Connect — Reply:** Reply to the review team in App Store Connect with the privacy/data collection answers from the review notes
5. **Deploy backend:** The new `deleteUser` Lambda and updated GraphQL schema need to be deployed before the app binary is submitted
6. **Screen recording:** Record a demo of the account deletion flow (create account → navigate to Info → tap Delete Account → complete deletion) and attach it to the review notes as requested
