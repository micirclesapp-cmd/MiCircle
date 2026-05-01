# 🗺️ Feature Location Guide - Where Everything Is

This guide shows you **exactly where each feature is located** in the Circles app.

---

## 📱 **Bottom Navigation Tabs**

The app has **4 main tabs** at the bottom:

1. **Discover** 🔍 - Find strangers with shared context (Pillar 2)
2. **Circles** 👥 - Your private circles with friends/family (Pillar 1)
3. **Plans** 📅 - All upcoming plans across all circles
4. **Profile** 👤 - Your account settings

---

## 🔍 **TAB 1: DISCOVER (Pillar 2 - Open Discovery)**

**Purpose:** Find and join public circles with strangers (no phone number exchange)

### What You See:
- **Category filters** at top (All, Travel & Transit, Fitness, Music & Arts, etc.)
- **Location selector** ("Near me 📍")
- **Search icon** (🔍) - Search for specific routes/trains
- **Feed of public circle cards** (when available)
- **FAB (+) button** (bottom right) - Create a new open circle card

### Features Available:
✅ **Browse public circles** - Scroll through feed
✅ **Filter by category** - Tap category chips
✅ **Search by transit route** - Tap 🔍 icon, enter train/flight number
✅ **Post a card** - Tap FAB (+) button or "Post a Card" in empty state
✅ **Join circles** - Tap any card, then "Join" button
✅ **No phone number exchange** - Privacy by design

### How to Create an Open Circle:
1. Tap **FAB (+) button** (bottom right)
2. Choose category (Travel, Hobby, Neighbourhood, etc.)
3. Add title and description
4. Set join mode (Open or Approval required)
5. Set expiry time
6. Post!

---

## 👥 **TAB 2: CIRCLES (Pillar 1 - Private Circles)**

**Purpose:** Your private circles with people you already know

### What You See:
- **"My Circles" header** with **+ button** (top right)
- **List of your circles** (when you have any)
- **Empty state** with "Create a Circle" and "Join with Link" buttons

### Features Available:
✅ **Create private circle** - Tap + button or "Create a Circle"
✅ **Join with invite link** - Tap "Join with Link", enter code
✅ **View all your circles** - Scroll through list
✅ **See unread messages** - Red badge on circles with new messages
✅ **Tap any circle** to open it

### How to Create a Private Circle:
1. Tap **+ button** (top right) or "Create a Circle"
2. **Step 1:** Choose circle type (Friends, Family, Office, Custom)
3. **Step 2:** Add name, description, photo
4. **Step 3:** Review and create
5. **Share invite link** with friends

### Inside a Circle (After Tapping):
When you tap a circle, you see a **hub/dashboard** with 6 options:

1. **💬 Chat** - Send messages, images, GIFs, reactions, polls
2. **📅 Plans** - Create plans, RSVP, check availability
3. **📸 Memory Lane** - Shared photo gallery
4. **💰 Expenses** - Split bills, track balances
5. **👥 Members** - View circle members
6. **⚙️ Settings** - Circle settings, invite link, leave circle

### Chat Features (Inside Circle):
- Text messages
- Image sharing
- GIF picker (Giphy)
- Emoji reactions
- Reply to messages
- Create polls
- Real-time updates

### Plans Features (Inside Circle):
- Create plans (Hangout, Event, Trip)
- Set date, time, location
- RSVP (Yes, No, Maybe)
- Check availability
- Video call integration
- Plan reminders

### Memory Lane Features:
- Upload photos
- View shared memories
- Download photos
- Year in Circles summary

### Expenses Features:
- Add expenses
- Split equally or custom
- Track who owes whom
- Balance calculations
- Settle up

---

## 📅 **TAB 3: PLANS**

**Purpose:** See all upcoming plans across all your circles in one place

### What You See:
- **"Upcoming Plans" header**
- **List of all plans** from all circles
- **Grouped by date** (Today, Tomorrow, This Week, etc.)
- **Empty state** if no plans

### Features Available:
✅ **View all plans** - From all circles
✅ **Tap any plan** - See details
✅ **RSVP** - Yes, No, Maybe
✅ **Join video call** - If plan has video call
✅ **See who's coming** - Member list with RSVP status

---

## 👤 **TAB 4: PROFILE**

**Purpose:** Your account settings and preferences

### What You See:
- **Your avatar** and email
- **User ID**
- **Account section:**
  - Edit Profile
  - Settings
  - Privacy
- **About section:**
  - Help & Support
  - Terms of Service
  - Privacy Policy
- **Sign Out button**

### Features Available:
✅ **Edit profile** - Change name, avatar, bio
✅ **Settings** - App preferences
✅ **Privacy** - Privacy settings
✅ **Help & Support** - Get help
✅ **Sign out** - Log out of app

---

## 🎯 **Key Features Summary**

### **Pillar 1 - Private Circles** (Circles Tab)
| Feature | Location | How to Access |
|---------|----------|---------------|
| Create private circle | Circles tab | Tap + button (top right) |
| Join with invite link | Circles tab | Tap "Join with Link" |
| Chat | Inside circle | Tap circle → Chat |
| Plans | Inside circle | Tap circle → Plans |
| Video calls | Inside circle | Tap circle → Plans → Join Call |
| Split expenses | Inside circle | Tap circle → Expenses |
| Memory Lane | Inside circle | Tap circle → Memory Lane |
| Members | Inside circle | Tap circle → Members |
| Settings | Inside circle | Tap circle → Settings |

### **Pillar 2 - Open Discovery** (Discover Tab)
| Feature | Location | How to Access |
|---------|----------|---------------|
| Browse public circles | Discover tab | Scroll feed |
| Filter by category | Discover tab | Tap category chips |
| Search by transit | Discover tab | Tap 🔍 icon |
| Post a card | Discover tab | Tap FAB (+) button |
| Join circle | Discover tab | Tap card → Join |

---

## 🔐 **Privacy Features**

### **Phone Number Privacy:**
- ✅ Phone numbers **NEVER** stored in Firestore
- ✅ Only in Firebase Auth (encrypted)
- ✅ Users see display names and avatars only
- ✅ No phone number exchange in open circles

### **Clean Separation:**
- ✅ Private circles (Circles tab) - Separate collection
- ✅ Open circles (Discover tab) - Separate collection
- ✅ No mixing between the two

---

## 🚀 **Quick Start Guide**

### **For Private Circles (Friends/Family):**
1. Go to **Circles tab**
2. Tap **+ button** (top right)
3. Create circle
4. Share invite link with friends
5. Start chatting, planning, sharing!

### **For Open Discovery (Strangers):**
1. Go to **Discover tab**
2. Browse public circles or tap **FAB (+)**
3. Post a card or join existing circle
4. Connect without phone number exchange!

---

## ❓ **Common Questions**

**Q: Where do I create a private circle for my friends?**
A: Circles tab → Tap + button (top right)

**Q: Where do I find strangers to travel with?**
A: Discover tab → Filter by "Travel & Transit" → Join or post a card

**Q: Where do I see all my plans?**
A: Plans tab (shows all plans from all circles)

**Q: Where do I chat with my circle?**
A: Circles tab → Tap circle → Chat

**Q: Where do I split expenses?**
A: Circles tab → Tap circle → Expenses

**Q: Where do I see shared photos?**
A: Circles tab → Tap circle → Memory Lane

**Q: How do I join a video call?**
A: Circles tab → Tap circle → Plans → Tap plan with video call → Join

**Q: Where do I post a public card?**
A: Discover tab → Tap FAB (+) button (bottom right)

---

## ✅ **All Features Are Implemented!**

Every feature from the project report is in the app. The UI is clean and organized into 4 main tabs. If you don't see circles in the feed, it's because:

1. **No one has posted any public circles yet** (Discover tab)
2. **You haven't created or joined any private circles yet** (Circles tab)

The app is ready to use! 🎉
