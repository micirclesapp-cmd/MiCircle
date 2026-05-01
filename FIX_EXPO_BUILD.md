# 🔧 Fix Expo Build - Set Base Directory

**Problem:** Expo can't find `eas.json` because it's looking in the wrong directory.

**Solution:** Tell Expo the app is in the `circles` subdirectory.

---

## ✅ **Solution: Update Expo Dashboard Settings**

### **In the Expo Dashboard (where you are now):**

1. **Look at the "Start a build from GitHub" dialog**

2. **Find the "Base directory" or "Project root" field**
   - It might be under "Advanced settings" or similar

3. **Set it to:** `circles`

4. **Keep other settings:**
   - Git ref: `main`
   - EAS Build profile: `preview`
   - Environment: `Preview`

5. **Click "Confirm"** or "Start Build"

---

## 🎯 **Alternative: Use Command Line (EASIER)**

Close the Expo dashboard and use the command line instead:

```bash
cd C:\CirclesApp\circles
npx eas-cli login
npx eas-cli build --platform android --profile preview --clear-cache
```

This automatically uses the correct directory because you're running it FROM the circles folder.

---

## 📋 **Recommended: Command Line Method**

### **Step 1: Close the Expo Dashboard**

### **Step 2: Open Terminal**

### **Step 3: Run these commands:**

```bash
cd C:\CirclesApp\circles
npx eas-cli login
```

Enter your Expo credentials when prompted.

### **Step 4: Build APK:**

```bash
npx eas-cli build --platform android --profile preview --clear-cache
```

---

## 🆘 **If You Want to Use Expo Dashboard:**

The dashboard needs to know the app is in the `circles` folder.

**Option A: Move files to root** (Not recommended - too much work)

**Option B: Set base directory in dashboard:**
1. In the build dialog, look for "Advanced" or "Settings"
2. Find "Base directory" or "Project root"
3. Set to: `circles`
4. Start build

**Option C: Use command line** (Recommended - easiest!)

---

## ✅ **Easiest Solution (Command Line):**

```bash
# 1. Navigate to circles directory
cd C:\CirclesApp\circles

# 2. Login to EAS
npx eas-cli login

# 3. Build APK
npx eas-cli build --platform android --profile preview --clear-cache
```

**This will work because you're running the command from the correct directory!**

---

## 📊 **What Will Happen:**

```
✔ Logged in
✔ Using project: CircleApp
✔ Using eas.json from: C:\CirclesApp\circles\eas.json
✔ Compressing project files
✔ Uploading to EAS Build
✔ Build started!

Build URL: https://expo.dev/accounts/...

Wait 18-25 minutes for build to complete.
```

---

## 🎯 **Current Status:**

- ✅ Code pushed to GitHub
- ✅ EAS CLI installed
- ✅ eas.json exists in circles folder
- ⚠️ Expo dashboard looking in wrong folder
- ✅ **Solution:** Use command line OR set base directory

---

## 🚀 **Do This Now:**

**Close the Expo dashboard and run:**

```bash
cd C:\CirclesApp\circles
npx eas-cli login
npx eas-cli build --platform android --profile preview --clear-cache
```

**This is the easiest way!** 🎉

