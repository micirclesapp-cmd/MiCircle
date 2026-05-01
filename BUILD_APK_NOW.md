# 🚀 Build APK - Step by Step

**Status:** ✅ Code pushed to GitHub  
**Next:** Build APK

---

## ⚠️ **IMPORTANT: Run from Correct Directory**

You must run the build command from the `circles` directory (where eas.json is located).

---

## ✅ **Method 1: Use the Batch File (EASIEST)**

I've created a batch file that automatically runs from the correct directory:

1. **Navigate to the circles folder:**
   ```bash
   cd circles
   ```

2. **Double-click:** `build-apk.bat`

   OR run in terminal:
   ```bash
   ./build-apk.bat
   ```

**Done!** The build will start automatically.

---

## ✅ **Method 2: Manual Command**

### **Step 1: Navigate to circles directory**

```bash
cd C:\CirclesApp\circles
```

### **Step 2: Verify you're in the right place**

```bash
ls eas.json
```

You should see: `eas.json`

### **Step 3: Run build command**

```bash
eas build --platform android --profile preview --clear-cache
```

---

## 📊 **What Will Happen:**

```
✔ Compressing project files
✔ Uploading to EAS Build
✔ Queued build
✔ Build in progress...

Phase 1: Install dependencies (2-3 min)
  - Installing all npm packages
  - Including Daily.co dependencies

Phase 2: Bundle JavaScript (2-3 min)
  - Bundling all React Native code
  - Should complete without errors now

Phase 3: Build Android app (10-15 min)
  - Compiling native Android code
  - Creating APK file

Phase 4: Upload artifacts (1-2 min)
  - Uploading APK to EAS servers

✔ Build complete!
Download: https://expo.dev/artifacts/eas/...
```

---

## ⏱️ **Total Time: 15-20 minutes**

---

## 🆘 **If You Get Errors:**

### **Error: "Failed to read /eas.json"**
**Solution:** Make sure you're in the `circles` directory
```bash
cd C:\CirclesApp\circles
```

### **Error: "eas: command not found"**
**Solution:** Install EAS CLI
```bash
npm install -g eas-cli
```

### **Error: "Not logged in"**
**Solution:** Login to EAS
```bash
eas login
```

### **Error: "Project not configured"**
**Solution:** Link project to EAS
```bash
eas build:configure
```

---

## ✅ **Quick Commands:**

```bash
# Navigate to circles directory
cd C:\CirclesApp\circles

# Verify eas.json exists
ls eas.json

# Build APK
eas build --platform android --profile preview --clear-cache
```

---

## 📱 **After Build Completes:**

1. **Download APK** from the link EAS provides
2. **Transfer to Android phone** (via USB, email, or cloud)
3. **Install APK** on phone
4. **Test all features!**

---

## 🎯 **Current Status:**

- ✅ Code pushed to GitHub
- ✅ All dependencies installed
- ✅ eas.json configured
- ✅ Ready to build

**Just run the command from the circles directory!**

---

## 🚀 **Run This Now:**

```bash
cd C:\CirclesApp\circles
eas build --platform android --profile preview --clear-cache
```

**OR**

Double-click: `circles/build-apk.bat`

---

**Good luck!** 🎉

