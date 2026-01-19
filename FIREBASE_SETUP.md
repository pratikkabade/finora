# Firebase Integration Setup Guide

## Overview

Your Finance Tracker app is now fully integrated with Firebase for cloud synchronization and authentication.

## Features Implemented

### 1. **Google Authentication**

- Users can log in with their Google account
- Automatic session management
- Each user gets a unique `uid` for data isolation

### 2. **Data Synchronization**

- **First Login**: App fetches data from Firestore (if available) or creates default data
- **Subsequent Visits**: App loads from browser's local cache for instant loading
- **Manual Backup**: Users can click "Backup to Firebase" button in Settings to upload data
- **Offline Support**: App works offline using local cache and IndexedDB persistence

### 3. **Data Storage Architecture**

```
Firebase Firestore
└── users (collection)
    └── {userId} (document)
        └── data (subcollection)
            └── finance (document)
                ├── accounts
                ├── categories
                ├── transactions
                ├── lastSynced (timestamp)
                └── lastModified (timestamp)
```

## Firebase Setup Instructions

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" and name it (e.g., "Finance Manager Application")
3. Enable Google Analytics (optional)
4. Complete project setup

### Step 2: Enable Firebase Services

#### Authentication

1. Go to **Authentication** → **Sign-in method**
2. Enable **Google** sign-in
3. Add your domain to authorized domains:
   - For local development: `localhost:5173`
   - For production: Your deployed domain

#### Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Select **Start in production mode**
4. Choose your region (closest to your users)
5. Click **Create**

### Step 3: Set Firestore Security Rules

Go to **Firestore Database** → **Rules** and replace everything with:

**⚠️ IMPORTANT: Copy the entire rules block below exactly**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authenticated users can access their own data
    match /users/{userId} {
      // User can read/write their root document
      allow read, write: if request.auth.uid == userId;

      // User can read/write all subcollections and documents under their user ID
      match /{allPaths=**} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**After pasting rules:**

1. Click **Publish**
2. Wait for rules to be deployed (usually 1-2 seconds)
3. You should see a green checkmark

### Step 3.1: Verify Rules Are Published

1. Go to **Firestore Database** → **Rules** tab
2. Verify you see the rules you just pasted
3. Look for green status indicator
4. If you see red ❌, there's a syntax error - copy the rules again carefully

### Step 4: Get Firebase Credentials

1. Go to **Project Settings** (gear icon)
2. Under **Your apps**, select **Web** (or create new)
3. Copy your Firebase config:
   ```javascript
   {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "..."
   }
   ```

### Step 5: Configure Environment Variables

Update `.env` file with your credentials:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_GOOGLE_CLIENT_ID=your_google_client_id
```

**Note**: The `.env` file is ignored by git (see `.gitignore`), so your credentials won't be committed.

## Troubleshooting

### Error: "Failed to get document because the client is offline"

**Causes:**

1. Invalid Firebase credentials in `.env`
2. Firestore Rules blocking access
3. Network connectivity issue
4. Firestore API not enabled

**Solutions:**

1. Verify all environment variables are correct
2. Check Firestore security rules (see Step 3 above)
3. Check browser console for detailed errors
4. Ensure Firestore database is created and active

### Error: "Permission denied"

**Most Common Cause:** Security rules have not been updated or published yet.

**Quick Fix Steps:**

1. **Open Firebase Console** → Your Project → Firestore Database
2. **Click "Rules" tab** at the top
3. **Clear all existing rules** (select all and delete)
4. **Paste this exactly:**

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

5. **Click "Publish"** button (bottom right)
6. **Wait for green checkmark** ✓
7. **Refresh your app** in browser
8. **Try backup again**

**Why This Happens:**

- Firestore starts in "production mode" (denies all access by default)
- Security rules must be updated to allow authenticated users to write
- Each user can only access their own data (identified by `userId`)

**Verify Rules Are Correct:**

- Go to Firebase Console → Firestore → Rules
- You should see your rules with no red errors
- Status indicator should be green ✓

### Error: "Permission denied" - Still Not Working?

**Debug Steps:**

1. **Check if you're logged in:**
   - Open Settings modal in app
   - You should see "Logout (your-email@gmail.com)"
2. **Re-authenticate:**

   - Click "Logout" in Settings
   - Click "Sign in with Google"
   - Try backup again

3. **Check Firestore directly:**
   - Firebase Console → Firestore Database
   - Under "users" collection, you should see your userId document
   - If you don't see it, rules may still be blocking writes

### Data Not Syncing

**Possible Issues:**

1. User not properly authenticated
2. Local cache being used (intentional behavior)
3. Firestore database not configured

**Check:**

1. Open browser DevTools → Application → Local Storage
2. Look for keys starting with `financeAppData_`
3. Check browser console for error messages

### Offline Usage

The app is designed to work offline:

- Data loads from **localStorage** on repeat visits
- Changes are saved to **localStorage** automatically
- Use "Backup to Firebase" button to manually sync when online
- IndexedDB provides additional offline persistence

## App Flow

### Login Journey

```
User → Login Page → Google Auth → Load Data
                                      ├─ Try localStorage
                                      ├─ If empty, try Firebase
                                      └─ If Firebase fails, use defaults

                    → App Dashboard
```

### Data Backup Journey

```
User Makes Changes → Auto-saved to localStorage
                           ↓
              User clicks "Backup to Firebase"
                           ↓
                      Firebase Updated
                           ↓
                      Success Message
```

### Logout Journey

```
User clicks "Logout" → Confirm dialog → Session cleared → Login Page
```

## Development Tips

### View Firestore Data

1. Go to Firebase Console
2. Navigate to Firestore Database
3. Expand `users` collection
4. Click on your user ID (shown in Settings modal)
5. View stored transactions, accounts, categories

### Test Offline Mode

1. Open DevTools → Network tab
2. Select "Offline" from the throttling dropdown
3. Refresh page → App loads from localStorage
4. Make changes → Verify they're saved locally

### Enable Debug Logs

Add to browser console:

```javascript
localStorage.debug = "firebase:*";
```

## Security Notes

✅ **What's Protected:**

- Each user only accesses their own data (Firestore Rules)
- Authentication required via Google
- API keys are in environment variables (not committed)
- Passwords never stored (OAuth)

⚠️ **What to Remember:**

- Never commit `.env` to git
- Review Firestore rules in production
- Enable backups for Firestore database
- Monitor Firestore usage/costs

## Environment Variables Reference

| Variable                            | Source               | Purpose                                |
| ----------------------------------- | -------------------- | -------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | Firebase Settings    | Identifies your Firebase project       |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Firebase Settings    | OAuth redirect domain                  |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase Settings    | Firestore database identifier          |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Firebase Settings    | Cloud Storage (for future use)         |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Settings    | FCM service (for future notifications) |
| `VITE_FIREBASE_APP_ID`              | Firebase Settings    | App identifier                         |
| `VITE_FIREBASE_GOOGLE_CLIENT_ID`    | Google Cloud Console | OAuth client ID                        |

## Common Issues Checklist

### Before Testing Backup:

- [ ] Firestore database is created in "production mode"
- [ ] **Security rules are updated and published** (most common issue!)
- [ ] Google sign-in is enabled in Authentication
- [ ] You're successfully logged in (see email in Settings modal)
- [ ] `.env` file has valid Firebase credentials

### When Backup Shows "Permission denied":

1. [ ] Go to Firebase Console → Firestore → Rules tab
2. [ ] Copy the rules from "Step 3" section above
3. [ ] Paste them, replacing all existing rules
4. [ ] Click "Publish"
5. [ ] Wait for green checkmark ✓
6. [ ] Refresh browser
7. [ ] Try backup again

### Other Checks:

- [ ] No typos in environment variables
- [ ] Network tab shows requests to `firestore.googleapis.com` (no 403 errors)
- [ ] Browser console shows your userId when logged in

## 🚀 Quick Start (For Impatient Users)

1. Create Firebase project: https://console.firebase.google.com
2. Enable Firestore + Google Auth
3. Update Firestore Rules (copy from Step 3)
4. Get Firebase config (Project Settings)
5. Fill `.env` with your credentials
6. Run `npm run dev`
7. Login with Google
8. Try "Backup to Firebase"

## Next Steps

1. Set up Firebase project following steps above
2. Add your credentials to `.env`
3. Run `npm run dev`
4. Test login flow
5. Create some transactions
6. Click "Backup to Firebase" in Settings
7. Check Firestore console to verify data

Enjoy your synchronized finance tracker!
