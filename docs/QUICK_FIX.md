# Quick Visual Guide: Fix Permission Error

## The Problem

```
❌ Error: Permission denied.
   Please check your Firestore security rules.
```

## The Fix (Copy-Paste)

### 1. Firebase Console

```
https://console.firebase.google.com
    ↓
Select your project
    ↓
Left menu → Firestore Database
```

### 2. Go to Rules Tab

```
[Data] [Indexes] [Rules] ← Click here
```

### 3. Copy These Rules

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

### 4. Paste & Publish

```
1. Select all existing text (Ctrl+A)
2. Delete
3. Paste the rules above
4. Click [Publish] button
5. Wait for green checkmark ✓
```

### 5. Test

```
1. Refresh browser
2. Click Settings in app
3. Click "Backup to Firebase"
4. Should see "Backup successful!" ✓
```

## How to Know It Worked

✅ Green status indicator in Firebase Console
✅ No red error in Rules editor
✅ App shows "Backup successful!"
✅ Data appears in Firestore Database

## If Still Failing

### Check 1: Rules Published?

- Open Firestore → Rules
- Should see your rules (not default ones)
- Look for green status indicator

### Check 2: Logged In?

- Open app Settings
- Should show "Logout (your-email@gmail.com)"
- If not, click Google login first

### Check 3: Firebase Credentials?

- Check `.env` file
- All values filled in (not placeholder text)?
- No extra spaces?

### Check 4: Project Selected?

- Firebase Console top left
- Shows your "Finance Manager Application"?
- Or did you accidentally open wrong project?

## FAQ

**Q: How long does publishing take?**
A: Usually 1-2 seconds. If not done after 30 seconds, refresh page.

**Q: What if I see a red error in Rules?**
A: Copy the rules again - there's a syntax error. Check brackets `{}` and commas `,`.

**Q: Will other people see my data?**
A: No. Rules ensure only you (your uid) can read/write your data.

**Q: Can I change the rules later?**
A: Yes! Once you understand them, you can customize for your needs.

**Q: Why "production mode"?**
A: Firebase defaults to denying all access for security. You must explicitly allow it.

## Success Message

After this fix, you should see:

```
✓ Data backed up to Firebase successfully
```

And in Firestore Console under `users` collection:

- Your userId (example: `M8h2kL9vqX3wP2m7n9z1a4b5`)
  - `data` folder
    - `finance` document
      - accounts, categories, transactions, etc.

---

**Problem solved! Your data is now syncing with Firebase.** 🎉
