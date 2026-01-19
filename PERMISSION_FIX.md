# Fix: "Permission denied" Error - Complete Solution

## Problem

You're getting: `Error: Permission denied. Please check your Firestore security rules.`

## Root Cause

Your Firestore security rules haven't been updated yet. Firebase starts in "production mode" which blocks all access by default.

## ✅ Solution (5 Minutes)

### Step 1: Open Firebase Console

1. Go to https://console.firebase.google.com
2. Select your "Finance Manager Application" project
3. Click **Firestore Database** in the left menu

### Step 2: Access Rules

1. Click the **Rules** tab (at the top, next to "Data" and "Indexes")

### Step 3: Replace Rules

1. **Delete all existing content** in the rules editor
2. **Copy and paste this exactly:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      match /{allPaths=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 4: Publish

1. Click the **Publish** button (bottom right)
2. Wait for the green checkmark ✓
3. Rules should show "Published" status

### Step 5: Test in App

1. **Refresh your browser** (Ctrl+R or Cmd+R)
2. Open the Finance Tracker app
3. Click **Settings** (gear icon)
4. Click **Backup to Firebase**
5. You should see "Backup successful!" ✓

## What These Rules Do

- **`match /users/{userId}`** - Creates a folder for each user
- **`allow read, write: if request.auth.uid == userId`** - Only that user can access their folder
- **Each user's data is isolated and secure**

## Still Getting Permission Denied?

### Checklist:

- [ ] Rules are published (green status indicator)
- [ ] You're logged in (see email in Settings)
- [ ] Browser is refreshed
- [ ] No typos in `.env` file
- [ ] Firestore database exists (not showing "No database")

### Debug Steps:

1. Open browser **DevTools** (F12)
2. Go to **Console** tab
3. Copy and paste the contents of `DEBUG_PERMISSIONS.js`
4. Look at the output for clues
5. Check Firestore console for your user ID

### Common Mistakes:

- ❌ Rules not published (forgot to click Publish)
- ❌ Using old rules that don't match code path
- ❌ Syntax errors in rules (red ❌ in console)
- ❌ Not logged in (email shows in Settings)
- ❌ Different project (check Firebase Console project name)

## Data Security

Your rules ensure:

- ✅ Only you can access your financial data
- ✅ Google knows you're authenticated before allowing access
- ✅ Each user's data is completely isolated
- ✅ Impossible for other users to see your transactions

## Backup Functionality

After fixing permissions:

- **Changes are auto-saved to local storage** (instant)
- **Click "Backup to Firebase"** to sync to cloud
- **Logout/login doesn't lose data** (saved in Firebase)
- **Can use app offline** (loads from local cache)

## What's Next?

Once backup works:

1. ✅ Create some transactions
2. ✅ Click "Backup to Firebase"
3. ✅ Logout and login again
4. ✅ Your data reappears from Firebase
5. ✅ Test offline mode (DevTools → Network → Offline)

## Need More Help?

See **FIREBASE_SETUP.md** for:

- Complete setup instructions
- Troubleshooting guide
- Development tips
- Architecture explanation

---

**Key Takeaway:** The "Permission denied" error almost always means **Firestore security rules haven't been published yet**. Follow the 5-step solution above and you should be good to go!
