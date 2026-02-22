/**
 * auth.js — Firebase Authentication module
 */

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyByNls0SQLIs2KHgVwHFQUsbthAG2ZdR6c",
    authDomain: "blog-bca42.firebaseapp.com",
    projectId: "blog-bca42",
    storageBucket: "blog-bca42.firebasestorage.app",
    messagingSenderId: "368876770630",
    appId: "1:368876770630:web:29d1184df011533e2e8147",
    measurementId: "G-9H7S6K9JGQ"
};

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
    signOut, updateProfile, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp,
    deleteDoc, updateDoc, doc, getDoc, setDoc, where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAnalytics, logEvent } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let analytics;
try {
    analytics = getAnalytics(app);
} catch (err) {
    console.warn("Firebase Analytics could not be initialized:", err);
}

// ─── Profile Support ──────────────────────────────────────────
/**
 * Sync user profile to Firestore
 */
async function syncUserProfile(user) {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            displayName: user.displayName || 'Pulse Reader',
            email: user.email,
            photoURL: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
            bio: "I'm a reader at The Pulse.",
            socials: { twitter: '', github: '', linkedin: '' },
            createdAt: serverTimestamp()
        });
    } else {
        // Update basic info in case it changed in Google/Auth
        await updateDoc(userRef, {
            displayName: user.displayName || snap.data().displayName,
            photoURL: user.photoURL || snap.data().photoURL
        });
    }
}

/**
 * Update extended profile data (Bio, Socials)
 */
async function updateUserProfile(data) {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
}

export {
    auth, db, analytics, logEvent, collection, addDoc, getDocs, query,
    orderBy, serverTimestamp, deleteDoc, updateDoc, doc, getDoc, where,
    updateUserProfile
};

// ─── DOM Helpers ─────────────────────────────────────────── 
const get = id => document.getElementById(id);

// ─── UI Functions ─────────────────────────────────────────── 
function toggleAuthModal(show) {
    const modal = get('auth-modal');
    if (!modal) return;
    modal.classList.toggle('active', show);
    if (show) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
}

function updateAuthUI(user) {
    const doUpdate = () => {
        const section = get('user-section');
        const mobileSection = get('mobile-user-section');
        const btn = get('auth-btn');
        const mobileBtn = get('mobile-auth-btn');

        if (user) {
            // User is signed in
            const userHtml = `
                <div class="user-profile">
                    <a href="profile.html">
                        <img src="${user.photoURL || 'https://i.pravatar.cc/150?u=' + user.uid}" alt="${user.displayName}" class="user-avatar">
                    </a>
                    <div class="user-info">
                        <span class="user-name"><a href="profile.html" style="text-decoration:none; color: var(--color-heading); font-weight: 800;">${user.displayName || 'Pulse Reader'}</a></span>
                        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
                            <a href="profile.html" class="logout-link" style="text-decoration: none; color: var(--color-primary); font-weight: 700; font-size: 0.85rem;">Settings</a>
                            <span style="opacity: 0.3; font-size: 0.8rem;">•</span>
                            <button class="logout-link logout-btn-action" style="font-size: 0.85rem;">Sign Out</button>
                        </div>
                    </div>
                </div>
            `;
            if (section) section.innerHTML = userHtml;
            if (mobileSection) mobileSection.innerHTML = userHtml;

            if (btn) btn.style.display = 'none';
            if (mobileBtn) mobileBtn.style.display = 'none';

            // Re-attach listeners
            document.querySelectorAll('.logout-btn-action').forEach(b => {
                b.ontouchstart = b.onclick = (e) => {
                    e.preventDefault();
                    signOut(auth).then(() => {
                        console.log('Signed out successfully');
                    }).catch(err => console.error(err));
                };
            });
        } else {
            // User is signed out
            if (section) section.innerHTML = '';
            if (mobileSection) mobileSection.innerHTML = '';
            if (btn) btn.style.display = 'flex';
            if (mobileBtn) mobileBtn.style.display = 'flex';
        }

        if (window.lucide) window.lucide.createIcons();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', doUpdate);
    } else {
        doUpdate();
    }
}

let isLoginMode = true;

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = get('auth-title');
    const submitBtn = get('auth-submit-btn');
    const toggleBtn = get('auth-toggle-btn');
    const nameField = get('auth-name-field');

    if (title) title.textContent = isLoginMode ? 'Sign In to Your Account' : 'Create an Account';
    if (submitBtn) submitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
    if (toggleBtn) {
        toggleBtn.innerHTML = isLoginMode
            ? 'Don\'t have an account? <span>Sign Up</span>'
            : 'Already have an account? <span>Sign In</span>';
    }
    if (nameField) nameField.style.display = isLoginMode ? 'none' : 'block';
}

// ─── Auth Listeners ───────────────────────────────────────── 
onAuthStateChanged(auth, async (user) => {
    // 1. Update UI Instantly (Fail-safe)
    if (user) {
        document.body.classList.add('user-logged-in');
    } else {
        document.body.classList.remove('user-logged-in');
    }
    updateAuthUI(user);

    // 2. Perform background sync
    if (user) {
        try {
            await syncUserProfile(user);
            // Refresh UI once more to get latest Firestore data (e.g. updated photoURL)
            updateAuthUI(auth.currentUser);
        } catch (err) {
            console.warn("Profile sync failed:", err);
        }
    }

    if (user) toggleAuthModal(false);
});

// ─── Event Listeners ──────────────────────────────────────── 
document.addEventListener('DOMContentLoaded', () => {
    // Re-query elements inside DOMContentLoaded for robustness
    const currentAuthForm = document.getElementById('auth-form');
    const currentGoogleBtn = document.getElementById('google-signin-btn');
    const currentAuthBtn = document.getElementById('auth-btn');
    const currentMobileAuthBtn = document.getElementById('mobile-auth-btn');

    currentAuthBtn?.addEventListener('click', () => toggleAuthModal(true));
    currentMobileAuthBtn?.addEventListener('click', () => toggleAuthModal(true));

    document.getElementById('auth-close')?.addEventListener('click', () => toggleAuthModal(false));

    document.getElementById('auth-toggle-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });

    // Google Sign In
    currentGoogleBtn?.addEventListener('click', async () => {
        try {
            const btn = currentGoogleBtn;
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<i data-lucide="loader" class="animate-spin" style="width:18px;"></i> Signing in...';
            if (window.lucide) window.lucide.createIcons();

            await signInWithPopup(auth, googleProvider);
            logEvent(analytics, 'login', { method: 'google' });
            toggleAuthModal(false);
        } catch (err) {
            console.error('Google Auth error:', err);
            alert('Google login failed: ' + err.message);
            currentGoogleBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo"> Continue with Google';
        }
    });

    currentAuthForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('auth-submit-btn');
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name')?.value;

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = isLoginMode ? 'Signing in...' : 'Creating...';
            }

            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
                logEvent(analytics, 'login', { method: 'email' });
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, {
                    displayName: name,
                    photoURL: `https://i.pravatar.cc/150?u=${userCredential.user.uid}`
                });
                await syncUserProfile(userCredential.user);
                logEvent(analytics, 'sign_up', { method: 'email' });
                updateAuthUI(userCredential.user);
            }
            toggleAuthModal(false);
        } catch (error) {
            console.error('Auth error:', error.code, error.message);
            let msg = error.message;
            if (error.code === 'auth/invalid-credential') msg = "Invalid email or password.";
            if (error.code === 'auth/user-not-found') msg = "No account found with this email.";
            alert(msg);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
            }
        }
    });

    const modal = document.getElementById('auth-modal');
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) toggleAuthModal(false);
    });
});
