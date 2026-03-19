# Quick Start Guide - New Features

## 🍎 Install Finora on iPhone

### Steps:

1. Open Safari on your iPhone
2. Visit your Finora app URL
3. Tap the **Share** button (square with arrow)
4. Scroll down and tap **Add to Home Screen**
5. Name it "Finora" (or custom name)
6. Tap **Add**

The app will now appear on your home screen as a standalone app!

---

## 🔒 Set Up PIN Protection

### Why PIN?

Protect your financial data from unauthorized access on shared devices.

### How to Set PIN:

1. Open Finora app
2. Click the **Settings** ⚙️ icon
3. Scroll to **"Security"** section
4. Click **"Set PIN"**
5. Enter a 4-6 digit PIN
6. Confirm the PIN
7. Done! ✅

### Every time you open Finora:

- A PIN verification screen will appear
- Enter your PIN to access your data
- Wrong PIN? You'll see how many attempts remain

### If you forget your PIN:

- After 5 wrong attempts, account locks for 15 minutes
- No password recovery - PIN is local only
- If lost, clear browser data and set a new PIN

### Change or Remove PIN:

1. Settings → Security
2. Click **"Change PIN"** or **"Remove PIN"**
3. Follow prompts

---

## ⚡ Quick Add Transaction

### New Way (Streamlined):

1. Click the blue **"Add"** button
2. A modal opens with just the transaction form
3. Fill in your details
4. Submit → Done!

### Or use direct URL:

- Go to `/add` path
- Opens transaction form immediately

### Benefits:

- Faster than before
- Focused interface
- No distractions

---

## 📊 Check Sync Status

### Location:

Top of the homepage in the header

### What it shows:

- **🟢 "Synced just now"** - Data is backed up to cloud
- **🟡 "Local only"** - Data is only on your device
- **Time indicator** - "5m ago", "2h ago", etc.

### How to sync:

1. Open Settings
2. Scroll to "Safeguard data"
3. Click **"Backup to Cloud"** to upload
4. Click **"Cloud"** under "Sync local data from" to download

---

## 🌙 Dark Mode

### Toggle Dark Mode:

1. Open Settings
2. Look for **"Appearance"** section
3. Click the **"Dark Mode"** or **"Light Mode"** button
4. Page switches immediately
5. Setting persists after refresh

### It works:

- On all pages
- Saves your preference
- Perfect for night use

---

## 💡 Troubleshooting

### iPhone zoom issue when filling forms?

✅ Fixed! No more auto-zoom when clicking date/time fields

### Can't find the Add button?

- Look for the blue **"+"** button in the bottom-right
- Or visit `/add` URL directly

### PIN not appearing after setting it?

- Close and reopen the app completely
- Try logging out and back in
- Check browser localStorage settings

### Dark mode not working?

- Scroll down in Settings to find it
- Make sure you're logged in
- Refresh the page

### Can't sync data?

- Check internet connection
- Try "Backup to Cloud" from Settings
- Check that you're logged in to Firebase

---

## 🚀 Tips for Best Experience

1. **Install on home screen** - Faster access, feels like native app
2. **Set PIN if shared device** - Protects your financial data
3. **Backup regularly** - Use "Backup to Cloud" weekly
4. **Use dark mode at night** - Better for your eyes
5. **Quick add** - Use the `/add` route for fast entries

---

## 📱 What's New?

| Feature         | What It Does                      |
| --------------- | --------------------------------- |
| PWA Manifest    | Install app on iPhone home screen |
| ZIP Fix         | No auto-zoom on form inputs       |
| Sync Indicator  | See if data is backed up          |
| /add Route      | Fast transaction creation         |
| PIN Protection  | Secure your homepage              |
| App Description | Better SEO & sharing              |

---

## 🔐 PIN Security Details

- **Local Storage Only** - PIN never leaves your device
- **No Cloud Backup** - PIN is not stored on servers
- **Per Device** - Each device can have different PIN
- **Encrypted** - Basic encryption with btoa
- **Auto-Lock** - 15-min lockout after 5 wrong attempts

---

For full documentation, see `IMPLEMENTATION_SUMMARY.md`

Generated: January 24, 2026
