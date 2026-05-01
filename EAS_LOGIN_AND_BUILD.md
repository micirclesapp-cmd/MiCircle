# 🔐 EAS Login and Build Instructions

**Status:** ✅ EAS CLI installed  
**Next:** Login and build

---

## ✅ **Step 1: Login to EAS**

Run this command:

```bash
cd circles
npx eas-cli login
```

You'll be prompted for:
- **Email or username:** Your Expo account email
- **Password:** Your Expo account password

**Don't have an Expo account?**
- Go to: https://expo.dev/signup
- Create a free account
- Then login

---

## ✅ **Step 2: Build APK**

After logging in, run:

```bash
cd circles
npx eas-cli build --platform android --profile preview --clear-cache
```

---

## 📋 **Complete Commands (Copy & Paste):**

```bash
# Navigate to circles directory
cd C:\CirclesApp\circles

# Login to EAS
npx eas-cli login

# Build APK
npx eas-cli build --platform android --profile preview --clear-cache
```

---

## ⏱️ **Build Timeline:**

| Phase | Time |
|-------|------|
| Login | 1 minute |
| Upload project | 2-3 minutes |
| Install dependencies | 2-3 minutes |
| Bundle JavaScript | 2-3 minutes |
| Build Android app | 10-15 minutes |
| Upload APK | 1-2 minutes |
| **Total** | **18-25 minutes** |

---

## 📊 **What Will Happen:**

```
✔ Logged in as: your-email@example.com
✔ Compressing project files
✔ Uploading to EAS Build
✔ Queued build
✔ Build in progress...

Build URL: https://expo.dev/accounts/...

✔ Install dependencies
  - Installing all npm packages
  - Including Daily.co dependencies
  
✔ Bundle JavaScript
  - Bundling React Native code
  - Should complete without errors
  
✔ Build Android app
  - Compiling native code
  - Creating APK file
  
✔ Upload artifacts
  - Uploading APK to servers

✔ Build complete!

Download: https://expo.dev/artifacts/eas/...
```

---

## 🆘 **Troubleshooting:**

### **Problem: "eas: command not found"**
**Solution:** Use `npx eas-cli` instead of `eas`

```bash
npx eas-cli login
npx eas-cli build --platform android --profile preview --clear-cache
```

### **Problem: "Not logged in"**
**Solution:** Run login command first

```bash
npx eas-cli login
```

### **Problem: "No Expo account"**
**Solution:** Create account at https://expo.dev/signup

### **Problem: "Project not linked"**
**Solution:** EAS will automatically link it during first build

---

## ✅ **Quick Start:**

1. **Open terminal**
2. **Run these commands:**

```bash
cd C:\CirclesApp\circles
npx eas-cli login
npx eas-cli build --platform android --profile preview --clear-cache
```

3. **Wait 18-25 minutes**
4. **Download APK from the link**
5. **Install on phone**
6. **Test!**

---

## 📱 **After Build:**

1. **Download APK** from EAS link
2. **Transfer to Android phone**
3. **Install APK**
4. **Test all features:**
   - ✅ Authentication
   - ✅ Open Feed
   - ✅ Private Circles
   - ✅ Chat
   - ✅ Plans & RSVP
   - ✅ Memory Lane
   - ✅ Expenses
   - ✅ Video Calls
   - ✅ Push Notifications

---

## 🎯 **Current Status:**

- ✅ Code pushed to GitHub
- ✅ All dependencies installed
- ✅ EAS CLI installed
- ⚠️ Need to login to EAS
- ⚠️ Then build APK

---

## 🚀 **Run These Commands Now:**

```bash
cd C:\CirclesApp\circles
npx eas-cli login
npx eas-cli build --platform android --profile preview --clear-cache
```

**Good luck!** 🎉

