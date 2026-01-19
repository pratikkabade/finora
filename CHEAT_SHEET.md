# Firebase Permission Error - Cheat Sheet

## The Error You're Seeing

```
❌ Permission denied.
   Please check your Firestore security rules.
```

## The Fix (Copy-Paste in 3 Steps)

### Step 1: Open Rules

```
Firebase Console
  → Your Project
  → Firestore Database
  → [Rules tab]
```

### Step 2: Paste This Code

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

### Step 3: Publish & Test

```
1. Click [Publish]
2. Refresh browser
3. Try "Backup to Firebase" again
4. Should work! ✓
```

## If Still Broken

### ✓ Checklist

- [ ] Rules show green status in Firebase
- [ ] You're logged in (see email in Settings)
- [ ] Browser is refreshed (Ctrl+R)
- [ ] No red errors in Firebase Rules editor

### 🔧 Debug Steps

1. Open DevTools (F12)
2. Go to Console tab
3. Look for blue logs (✓ backed up) or red errors
4. Check localStorage:
   - Open Application tab
   - Look for `financeAppData_` keys

### 💬 Error Messages Decoded

| Error               | Cause               | Fix              |
| ------------------- | ------------------- | ---------------- |
| "Permission denied" | Rules not published | Publish rules    |
| "Client offline"    | No internet         | Check connection |
| "Not authenticated" | Logout then login   | Sign in again    |

## File Reference

| What You Need       | File               | Section   |
| ------------------- | ------------------ | --------- |
| **Quick fix**       | QUICK_FIX.md       | All       |
| **Troubleshooting** | PERMISSION_FIX.md  | All       |
| **Full setup**      | FIREBASE_SETUP.md  | Step 3    |
| **How it works**    | ARCHITECTURE.md    | Data Flow |
| **Complete guide**  | README_FIREBASE.md | All       |

## Key Concepts

### What Are Rules?

Rules are like a bouncer for your database:

- ✓ Allow Bob to read his own data
- ✗ Prevent Alice from reading Bob's data
- ✗ Deny anonymous users from accessing anything

### What's `request.auth.uid`?

Your unique ID that Firebase gives you when you login with Google

- Example: `M8h2kL9vqX3wP2m7n9z1a4b5`

### What's `userId`?

Variable that represents any user ID in the path

- Like a wildcard: `users/{any-user-id-here}`

### Rule Logic

```
request.auth.uid == userId
↓
"Is the person logged in the same as the person accessing this data?"
↓
If YES → Allow ✓
If NO → Deny ✗
```

## Security Guarantees

✅ Only YOU can access your data
✅ Google verifies you before granting access
✅ Other users blocked automatically
✅ Your financial data is private
✅ No one (including us) can see it

## After It's Fixed

### What Works

- ✓ Login with Google
- ✓ Auto-save to LocalStorage (instant)
- ✓ Manual backup to Firebase
- ✓ Works offline
- ✓ Logout/login doesn't lose data

### How to Use

1. **Create transactions** → Auto-saved locally
2. **Click "Backup to Firebase"** → Syncs to cloud
3. **Close app** → Data stays (offline-safe)
4. **Reopen app** → Loads instantly from cache
5. **Logout** → Session ends (data preserved)

## Offline vs Online

### When You Have Internet

- Changes save to LocalStorage immediately
- Click "Backup" to sync to Firebase
- Firebase is optional (nice-to-have)

### When You're Offline

- Changes save to LocalStorage
- Backup button is greyed out (can't reach Firebase)
- Reconnect to internet → Try backup

## Common Mistakes to Avoid

❌ Copy pasting partially (missing curly braces)
❌ Not clicking "Publish" button
❌ Trying to backup before publishing rules
❌ Multiple browser tabs (Firestore caching issues)
❌ Using different Firebase project
❌ Typos in `.env` file

## Success Indicators

✅ Green checkmark in Firebase Rules
✅ "Backup successful!" message in app
✅ Data shows in Firestore Database console
✅ Can logout and login, data persists
✅ App works offline

## Advanced: Manual Verification

In Firebase Console:

```
Firestore Database
  → Data tab
    → users (collection)
      → [Your User ID] (document)
        → data (collection)
          → finance (document)
            ├── accounts: [...]
            ├── categories: [...]
            ├── transactions: [...]
            └── lastSynced: 2025-01-18T...
```

## Pro Tips

💡 **Tip 1:** Backup before you need it
💡 **Tip 2:** Test offline mode (DevTools → Network → Offline)
💡 **Tip 3:** Check browser console for debug info
💡 **Tip 4:** Rules only need updating once

## Emergency Reset

If something goes really wrong:

```
1. Firebase Console → Firestore → Rules
2. Delete all content
3. Paste fresh rules from above
4. Click Publish
5. Refresh browser
6. Try again
```

---

## ⏱️ Timeline

| Step       | Time      | Notes              |
| ---------- | --------- | ------------------ |
| Read this  | 2 min     | You are here       |
| Copy rules | 1 min     | Copy-paste         |
| Publish    | 1 min     | Click button, wait |
| Test       | 1 min     | Try backup         |
| **Total**  | **5 min** | Done!              |

**You've got this! 🚀**
