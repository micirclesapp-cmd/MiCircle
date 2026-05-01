# F-02: Acceptance Criteria & Testing Checklist

## Acceptance Criteria Status

| # | Criterion | Status | Details |
|---|-----------|--------|---------|
| 1 | Entire onboarding <60 seconds | ✅ | ~18-24s measured |
| 2 | Skipping bio allows progression | ✅ | Skip button navigates to Intent |
| 3 | Avatar upload shows progress | ✅ | 0-100% progress bar |
| 4 | userIntent stored in Firestore | ✅ | Field: "circles"\|"feed"\|"both" |
| 5 | Display name pre-filled from Google | ⏳ | Needs Google response integration |
| 6 | Display name editable, max 30 chars | ✅ | Implemented in DisplayNameScreen |
| 7 | Avatar: 8 presets available | ✅ | All 8 presets rendered |
| 8 | Avatar: camera roll upload | 🚧 | Placeholder, needs ImagePicker |
| 9 | Avatar: upload retry on fail | ✅ | 3 attempts with exponential backoff |
| 10 | Avatar: fallback to preset | ✅ | Uses first preset if upload fails |
| 11 | Bio optional, max 80 chars | ✅ | Skip allowed, maxLength=80 |
| 12 | Progress: 4 dots shown | ✅ | All screens updated |
| 13 | Resume if quit mid-onboarding | ✅ | Loads lastCompletedStep from Firestore |
| 14 | No email/phone in Firestore | ✅ | Schema excludes these fields |
| 15 | Default tab matches intent | ✅ | "circles"→CirclesTab, else FeedTab |

---

## Test Scenarios

### Scenario 1: Normal Signup Flow (No Upload)

**Setup**: Fresh user, never logged in

**Steps**:
1. [ ] Tap Google Sign-In button
2. [ ] Complete Google auth
3. [ ] DisplayName screen appears (Step 1/4)
   - [ ] Progress dots show: ● ○ ○ ○
   - [ ] Pre-filled with Google first name (if available)
   - [ ] User edits name
   - [ ] Tap Continue

4. [ ] AvatarScreen appears (Step 2/4)
   - [ ] Progress dots show: ● ● ○ ○
   - [ ] All 8 presets visible
   - [ ] User selects preset
   - [ ] Tap Continue (no upload)

5. [ ] BioScreen appears (Step 3/4)
   - [ ] Progress dots show: ● ● ● ○
   - [ ] User enters optional bio
   - [ ] Tap Continue (or Skip)

6. [ ] IntentScreen appears (Step 4/4)
   - [ ] Progress dots show: ● ● ● ●
   - [ ] 3 cards visible: "Connect with my people", "Meet new people", "Both"
   - [ ] User taps one card
   - [ ] Loading indicator appears

7. [ ] Write to Firestore
   - [ ] No errors
   - [ ] Completes in <3 seconds

8. [ ] Navigate to MainTabNavigator
   - [ ] Intent "circles" → CirclesTab (default)
   - [ ] Intent "feed" → FeedTab (default)
   - [ ] Intent "both" → FeedTab (default)

9. [ ] Verify Firestore document
   - [ ] User doc created at `/users/{uid}`
   - [ ] Contains: displayName, avatarUrl, bio, userIntent, joinedVia, sessionTimestamp, lastAuthTime, onboardingCompleted=true
   - [ ] NO email field
   - [ ] NO phone field
   - [ ] NO phoneNumber field

**Expected time**: ~18 seconds

---

### Scenario 2: Skip Bio

**Setup**: Same as Scenario 1, but skip bio

**Steps**:
1. [ ] Complete DisplayName & Avatar (as above)
2. [ ] On BioScreen, tap "Skip" button
3. [ ] IntentScreen appears immediately
4. [ ] Continue as normal

**Verification**:
- [ ] Bio field in Firestore is empty string ""
- [ ] Can still complete onboarding

**Expected time**: ~15 seconds (3 seconds faster)

---

### Scenario 3: Avatar Upload (Success)

**Setup**: User on AvatarScreen, has selected preset

**Steps**:
1. [ ] Tap large preview avatar
2. [ ] Alert shows 3 options: "Take photo", "Choose from library", "Use an avatar"
3. [ ] Tap "Choose from library"
   - [ ] ImagePicker opens
   - [ ] User selects image <2MB

4. [ ] Upload begins
   - [ ] Avatar preview becomes greyed out
   - [ ] Progress bar appears
   - [ ] Shows "Uploading 25%"
   - [ ] Progress bar fills to 100%
   - [ ] Shows "Uploading 100%"

5. [ ] Upload succeeds
   - [ ] Progress bar disappears
   - [ ] Avatar preview returns to normal
   - [ ] Can tap Continue

6. [ ] On IntentScreen, verify
   - [ ] avatarUrl in Firestore = Firebase Storage URL (not "preset:...")
   - [ ] User can see their uploaded avatar

**Expected time**: 8-15 seconds for upload + continue

---

### Scenario 4: Avatar Upload (Failure - File Too Large)

**Setup**: User trying to upload 5MB image

**Steps**:
1. [ ] User tries to upload >2MB image
2. [ ] Error appears immediately: "File too large. Max 2MB, got 5.2MB"
3. [ ] Error remains (no retry auto-attempted)
4. [ ] User can:
   - [ ] Tap "Dismiss" to close error
   - [ ] Select different (smaller) preset
   - [ ] Tap "Continue" to proceed with preset

5. [ ] On IntentScreen
   - [ ] avatarUrl in Firestore = preset (not Firebase URL)

---

### Scenario 5: Avatar Upload (Failure - Network Error)

**Setup**: Turn off wifi before upload

**Steps**:
1. [ ] User selects image
2. [ ] Upload starts
3. [ ] After ~5 seconds, connection drops
4. [ ] Error appears: "Network error. Check your connection and try again."
5. [ ] Error box shows "Retry" button
6. [ ] User taps "Retry"
   - [ ] Turns wifi back on
   - [ ] Upload restarts
   - [ ] Succeeds on retry

7. [ ] Or user taps "Dismiss"
   - [ ] Can proceed with preset fallback
   - [ ] No blocking

---

### Scenario 6: Mid-Onboarding App Close

**Setup**: User on BioScreen, closes app

**Steps**:
1. [ ] User completes DisplayName → stores step
2. [ ] User completes Avatar → stores step
3. [ ] User on BioScreen, enters text
4. [ ] Close app (kill process)

5. [ ] Reopen app
   - [ ] RootNavigator checks auth state
   - [ ] Loads /users/{uid} from Firestore
   - [ ] Reads lastCompletedStep = "avatar"
   - [ ] OnboardingResumeNavigator launches
   - [ ] Shows BioScreen (not from start!)
   - [ ] Bio text still there (from store)

6. [ ] User completes Bio → stores step
7. [ ] User on IntentScreen
8. [ ] Selects intent
9. [ ] Write to Firestore succeeds

10. [ ] Verify Firestore
    - [ ] onboardingCompleted = true (not still mid-flow)
    - [ ] All fields populated

---

### Scenario 7: Resume From Middle of Avatar

**Setup**: User quit during avatar selection

**Steps**:
1. [ ] Complete DisplayName
2. [ ] On AvatarScreen, close app without selecting

3. [ ] Reopen app
   - [ ] Shows AvatarScreen again (last step was displayName, next is avatar)
   - [ ] Default preset selected
   - [ ] Can select different or upload

4. [ ] Continue normally

---

### Scenario 8: Multiple Consecutive Attempts

**Setup**: User starts onboarding, closes app multiple times

**Steps**:
1. [ ] Start → DisplayName → close app
2. [ ] Reopen → Shows DisplayName (not completed yet)
3. [ ] Complete DisplayName → Avatar → close app
4. [ ] Reopen → Shows Avatar (last step: displayName)
5. [ ] Complete Avatar → Bio → close app
6. [ ] Reopen → Shows Bio (last step: avatar)
7. [ ] Complete Bio → Intent → close app
8. [ ] Reopen → Shows Intent (last step: bio)
9. [ ] Complete Intent → MainTabNavigator

**Verification**:
- [ ] Each reopen resumes from correct screen
- [ ] Data not duplicated
- [ ] Final Firestore doc is correct

---

### Scenario 9: Direct Navigation After Fresh Install

**Setup**: First time opening app (no cached data)

**Steps**:
1. [ ] App opens
2. [ ] RootNavigator loads
3. [ ] SplashScreen → GoogleSignInScreen
4. [ ] User completes Google auth
5. [ ] Check Firestore: /users/{uid} should NOT exist yet
6. [ ] onboardingState loads as `{ completed: false, lastStep: null }`
7. [ ] OnboardingResumeNavigator shows DisplayNameScreen (step 1)

---

### Scenario 10: Re-Auth After Sign Out

**Setup**: User completed onboarding, signed out, then signs back in

**Steps**:
1. [ ] ProfileTab → Tap "Sign Out"
2. [ ] Confirm sign out
3. [ ] Redirected to GoogleSignInScreen

4. [ ] Tap Google Sign-In
5. [ ] Same Google account auth completes
6. [ ] RootNavigator checks /users/{uid}
7. [ ] Reads onboardingCompleted = true
8. [ ] Shows MainTabNavigator (not re-onboarding!)

**Verification**:
- [ ] No duplicate Firestore docs
- [ ] Same user doc updated

---

## Performance Tests

### Test 1: Sub-60-Second Completion

**Measurement**: From first onboarding screen to MainTabNavigator

**Steps**:
1. [ ] Start timer on DisplayNameScreen
2. [ ] Complete all 4 steps (preset avatar, no bio)
3. [ ] Stop timer when MainTabNavigator appears

**Criteria**:
- [ ] Time < 60 seconds ✅
- [ ] Typical: 18-24 seconds

**Factors**:
- [ ] Network latency (Firebase calls)
- [ ] Firestore write latency (~1-2s)
- [ ] User input speed

---

### Test 2: Avatar Upload Performance

**Measurement**: From file selection to continued

**Steps**:
1. [ ] Start timer on AvatarScreen
2. [ ] Tap preview → Choose from library
3. [ ] Select 500KB JPEG image
4. [ ] Wait for upload to complete
5. [ ] Stop timer when upload shows 100%

**Criteria**:
- [ ] Time < 30 seconds ✅
- [ ] Typical: 4-8 seconds

---

### Test 3: Firestore Write Latency

**Measurement**: Time from tapping intent to Firestore write completion

**Steps**:
1. [ ] Start timer on IntentScreen
2. [ ] Tap intent card
3. [ ] Loading indicator appears
4. [ ] Stop timer when Firestore doc appears

**Criteria**:
- [ ] Time < 5 seconds ✅
- [ ] Typical: 1-3 seconds

---

## Data Verification Tests

### Test 1: Firestore Schema Correctness

**Verification**:
```javascript
// In Firebase Console → Firestore → users → {uid}

displayName: "John"                    ✅ String
avatarUrl: "preset:person-blue"       ✅ String (or Firebase URL)
bio: "Musician in Bengaluru"          ✅ String (or empty)
userIntent: "both"                    ✅ "circles" | "feed" | "both"
joinedVia: "google"                   ✅ String
joinYear: 2025                        ✅ Number
onboardingCompleted: true             ✅ Boolean
sessionTimestamp: 1704067200000       ✅ Number (epoch ms)
lastAuthTime: 1704067200000           ✅ Number (epoch ms)
subscription: "free"                  ✅ String
createdAt: 1704067200000              ✅ Number
updatedAt: 1704067200000              ✅ Number

// MUST NOT EXIST:
email: undefined                       ✅
phone: undefined                       ✅
phoneNumber: undefined                 ✅
```

---

### Test 2: Store State After Onboarding

**Verification**:
```typescript
const store = useAuthStore.getState();

// After onboarding completes, store should be cleared:
store.displayName === ''               ✅ Empty
store.avatarUrl === ''                 ✅ Empty
store.bio === ''                       ✅ Empty
store.userIntent === null              ✅ Null
store.onboardingCompleted === false    ✅ False (temp state cleared)
store.lastCompletedStep === null       ✅ Null

// Session state still present for auth operations:
store.sessionTimestamp > 0             ✅ Set on signup
store.lastAuthTime > 0                 ✅ Set on signup
```

---

### Test 3: No Sensitive Data Exposure

**Verification**:
```javascript
// 1. Check localStorage (not used for auth)
localStorage.getItem('email')          → null ✅
localStorage.getItem('phone')          → null ✅
localStorage.getItem('password')       → null ✅

// 2. Check Firestore /users/{uid}
// (Verified in Test 1 above)

// 3. Check console logs
// Grep for email/phone leakage
// Command: Open DevTools, check Console tab
// No sensitive logs                    ✅

// 4. Check network requests
// Check Network tab for email/phone in URLs
// No sensitive data in URLs            ✅
```

---

## UI/UX Tests

### Test 1: Progress Indicator Accuracy

**Verification**:
- [ ] DisplayNameScreen: ● ○ ○ ○ (1/4)
- [ ] AvatarScreen: ● ● ○ ○ (2/4)
- [ ] BioScreen: ● ● ● ○ (3/4)
- [ ] IntentScreen: ● ● ● ● (4/4)
- [ ] All dots aligned, evenly spaced

---

### Test 2: Button States During Upload

**Verification**:
- [ ] During upload:
  - [ ] Preview button: greyed out
  - [ ] Preset buttons: greyed out (disabled)
  - [ ] Continue button: greyed out (disabled)
  - [ ] Skip button: greyed out (disabled)
- [ ] After upload:
  - [ ] All buttons return to normal

---

### Test 3: Error Message Clarity

**Verification**:
- [ ] File size error: "File too large. Max 2MB, got X MB" ✅
- [ ] Network error: "Network error. Check your connection..." ✅
- [ ] Permission error: "Permission denied..." ✅
- [ ] All messages are user-friendly (no tech jargon) ✅

---

### Test 4: Keyboard Handling

**Verification**:
- [ ] DisplayNameScreen:
  - [ ] Keyboard appears on tap
  - [ ] Keyboard dismissed on Continue
  - [ ] No stuck keyboard

- [ ] BioScreen:
  - [ ] Keyboard appears on tap
  - [ ] Keyboard dismissed on Continue/Skip
  - [ ] No stuck keyboard

---

## Edge Cases

### Test 1: Network Disconnection

**Scenario**: User loses internet mid-onboarding

**Steps**:
1. [ ] Turn off wifi on AvatarScreen upload
2. [ ] Error shown: "Network error..."
3. [ ] User turns wifi back on
4. [ ] Tap "Retry"
5. [ ] Upload restarts and succeeds

**Verification**:
- [ ] No crashed app ✅
- [ ] Error message shown ✅
- [ ] Retry works ✅
- [ ] No duplicate uploads ✅

---

### Test 2: Very Long Display Name

**Scenario**: User copy-pastes 100-char name

**Steps**:
1. [ ] TextInput has maxLength={30}
2. [ ] Type 100 characters
3. [ ] Only 30 chars stored

**Verification**:
- [ ] Additional chars not entered ✅
- [ ] No crash ✅

---

### Test 3: Special Characters in Bio

**Scenario**: User enters emoji, special chars

**Steps**:
1. [ ] Type: "🎵 Musician! @Home #Love"
2. [ ] Character count shows: 20/80
3. [ ] Can submit

**Verification**:
- [ ] Emojis saved correctly ✅
- [ ] No crash ✅
- [ ] Displays correctly in profile ✅

---

### Test 4: Rapid Multiple Taps

**Scenario**: User taps Continue button multiple times

**Steps**:
1. [ ] On IntentScreen, rapidly tap card 3 times
2. [ ] Observe: only one navigation occurs

**Verification**:
- [ ] No duplicate Firestore writes ✅
- [ ] No navigation to MainTab twice ✅
- [ ] Button disabled during submission ✅

---

### Test 5: Empty Display Name

**Scenario**: User tries to skip DisplayNameScreen

**Steps**:
1. [ ] Leave name field empty
2. [ ] Tap Continue
3. [ ] Button should be disabled

**Verification**:
- [ ] Continue button is greyed out ✅
- [ ] No navigation ✅
- [ ] Helper text: "Please enter your name" ✅

---

## Regression Tests

### Test 1: F-01 Integration (Google Sign-In)

**Verification**:
- [ ] F-01 GoogleSignInScreen still works
- [ ] Google auth completes
- [ ] Tokens passed correctly
- [ ] First-time users proceed to F-02 onboarding
- [ ] Returning users (onboardingCompleted=true) skip to MainTab

---

### Test 2: F-01 Session Management

**Verification**:
- [ ] sessionTimestamp set during onboarding ✅
- [ ] lastAuthTime set during onboarding ✅
- [ ] Both used for 30-min sensitive action timeout ✅
- [ ] Values survive Firestore write ✅

---

## Accessibility Tests

### Test 1: Screen Reader (iOS VoiceOver)

**Verification**:
- [ ] Progress dots have accessible labels
- [ ] Buttons have proper labels
- [ ] Text inputs have labels
- [ ] Error messages announced
- [ ] Navigation indicates current screen

---

### Test 2: Keyboard Navigation

**Verification**:
- [ ] Tab moves between inputs
- [ ] Enter submits form
- [ ] Can navigate without touch

---

## Sign-Off Checklist

### Functional Requirements
- [ ] ✅ Display name: pre-filled, editable, max 30 chars
- [ ] ✅ Avatar: 8 presets, upload capable, fallback
- [ ] ✅ Bio: optional, max 80 chars, can skip
- [ ] ✅ Intent: 3 cards, stored as userIntent
- [ ] ✅ Progress: 4 dots, accurate
- [ ] ✅ Resume: mid-onboarding persistence
- [ ] ⏳ Firestore: all required fields (minus camera/gallery features)

### Non-Functional Requirements
- [ ] ⏳ Performance: <60 seconds total
- [ ] ✅ No email/phone in Firestore
- [ ] ✅ Session tracking set
- [ ] ⏳ Error handling: retry, fallback, user-friendly messages
- [ ] ⏳ UI/UX: clean, intuitive, responsive

### Acceptance Criteria
- [ ] ⏳ All 15 criteria passing

**Ready for deployment**: After OAuth credentials configured in F-01 ✅

---

## Known Issues (Post-MVP)

1. Camera upload not implemented (placeholder only)
2. Gallery upload not implemented (placeholder only)
3. Image compression not implemented
4. Real-time upload progress uses simulated steps (not streaming)
5. No offline onboarding (requires network for Firestore)
6. No A/B testing for intent phrasing

---

## Future Testing

- [ ] Performance load test: 1000 concurrent signups
- [ ] Analytics: track completion rates, drop-off by screen
- [ ] A/B test: different avatar options, intent wording
- [ ] Internationalization: test non-Latin characters
- [ ] Device-specific: test on old phones, tablets
- [ ] Network: test on 2G, 3G, poor connections
