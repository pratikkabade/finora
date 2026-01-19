// Firebase Permissions Debugger
// Run this in browser console to diagnose "Permission denied" errors

(async function debugFirebasePermissions() {
    console.log('🔍 Firebase Permissions Debugger\n');

    // Check if user is logged in
    const auth = window.__FIREBASE_DEFAULTS__?.auth;
    if (!auth) {
        console.warn('❌ Firebase Auth not initialized');
        return;
    }

    // Get current user
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.error('❌ NO USER LOGGED IN - Cannot backup without login');
        console.log('✓ Solution: Click "Sign in with Google" in the app');
        return;
    }

    console.log('✓ User logged in:', currentUser.email);
    console.log('  User ID (uid):', currentUser.uid);

    // Check localStorage for data
    const storageKey = `financeAppData_${currentUser.uid}`;
    const localData = localStorage.getItem(storageKey);
    if (localData) {
        console.log('✓ Local data found in cache');
    } else {
        console.warn('⚠️  No local data - first time user or cache cleared');
    }

    // Test Firestore connection
    console.log('\n🔗 Testing Firestore Connection...');
    try {
        // This is just to show what the app will attempt
        const docPath = `users/${currentUser.uid}/data/finance`;
        console.log('   Will attempt to write to:', docPath);
        console.log('\n📋 Firestore Security Rules Check:');
        console.log('   ✓ Authenticated: Yes');
        console.log('   ✓ User ID:', currentUser.uid);
        console.log('   ⚠️  If you see "Permission denied" error, check:');
        console.log('      1. Firestore Rules are published (Firebase Console → Rules)');
        console.log('      2. Rules contain: allow read, write: if request.auth.uid == userId');
        console.log('      3. No syntax errors in rules (look for red errors)');
    } catch (e) {
        console.error('Error during test:', e.message);
    }

    console.log('\n💡 Next Steps:');
    console.log('1. Go to Firebase Console');
    console.log('2. Open your project → Firestore Database → Rules');
    console.log('3. Copy rules from FIREBASE_SETUP.md Step 3');
    console.log('4. Click Publish');
    console.log('5. Return to app and try backup again');

})();
