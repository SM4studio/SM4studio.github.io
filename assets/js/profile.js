/**
 * profile.js — User Dashboard and Profile management
 */
import {
    auth, db, doc, getDoc, collection, query, where, getDocs, orderBy,
    updateUserProfile
} from './auth.js';
import { updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const $ = id => document.getElementById(id);

// ─── Render Functions ─────────────────────────────────────────

async function renderProfileData(user) {
    if (!user) return;

    // 1. Fetch from Firestore (Extended Data)
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const userData = snap.exists() ? snap.data() : { bio: '', socials: {} };

    // 2. Update Sidebar
    const displayName = userData.displayName || user.displayName || 'Pulse Reader';
    const photoURL = userData.photoURL || user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`;
    const bio = userData.bio || "Welcome to my profile! I'm a reader at The Pulse.";

    if ($('display-name')) $('display-name').textContent = displayName;
    if ($('display-email')) $('display-email').textContent = user.email;
    if ($('display-bio')) $('display-bio').textContent = bio;
    if ($('display-avatar')) $('display-avatar').src = photoURL;

    // 3. Social Links
    const socials = userData.socials || {};
    if ($('link-twitter')) {
        const twitter = socials.twitter ? `https://twitter.com/${socials.twitter.replace('@', '')}` : '#';
        $('link-twitter').href = twitter;
        $('link-twitter').style.opacity = socials.twitter ? '1' : '0.3';
    }
    if ($('link-github')) {
        const github = socials.github ? `https://github.com/${socials.github}` : '#';
        $('link-github').href = github;
        $('link-github').style.opacity = socials.github ? '1' : '0.3';
    }
    if ($('link-linkedin')) {
        const linkedin = socials.linkedin || '#';
        $('link-linkedin').href = linkedin;
        $('link-linkedin').style.opacity = socials.linkedin ? '1' : '0.3';
    }

    // 4. Populate Form
    if ($('edit-name')) $('edit-name').value = displayName;
    if ($('edit-photo')) $('edit-photo').value = photoURL;
    if ($('edit-bio')) $('edit-bio').value = userData.bio || '';
    if ($('edit-twitter')) $('edit-twitter').value = socials.twitter || '';
    if ($('edit-github')) $('edit-github').value = socials.github || '';
    if ($('edit-linkedin')) $('edit-linkedin').value = socials.linkedin || '';
}

async function renderUserArticles(uid) {
    const list = $('user-posts-list');
    if (!list) return;

    try {
        const q = query(
            collection(db, 'posts'),
            where('authorId', '==', uid),
            orderBy('createdAt', 'desc')
        );

        const snap = await getDocs(q);

        if (snap.empty) {
            list.innerHTML = `<p style="color: var(--color-text-muted); padding:32px; text-align:center;">You haven't published any articles yet.</p>`;
            return;
        }

        let html = '';
        snap.forEach(docSnap => {
            const post = docSnap.data();
            const date = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Just now';

            html += `
                <div class="user-post-item">
                    <img src="${post.image}" alt="" class="user-post-thumb">
                    <div class="user-post-info">
                        <a href="post.html?id=${docSnap.id}" class="user-post-title">${post.title}</a>
                        <span class="user-post-date">${date} • ${post.category}</span>
                    </div>
                    <div class="user-post-actions" style="display:flex; gap:10px;">
                        <a href="post.html?id=${docSnap.id}" class="btn btn-edit" style="padding:6px 12px;"><i data-lucide="eye" style="width:14px;"></i></a>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('Error fetching user posts:', err);
    }
}

// ─── Initialization ───────────────────────────────────────────

auth.onAuthStateChanged(async (user) => {
    if (user) {
        await renderProfileData(user);
        await renderUserArticles(user.uid);
    } else {
        // Redirect or show login
        console.log('User not logged in, showing modal');
        const modal = $('auth-modal');
        if (modal) modal.classList.add('active');
    }
});

// ─── Event Handlers ───────────────────────────────────────────

$('profile-edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('save-profile-btn');
    const user = auth.currentUser;
    if (!user) return;

    try {
        btn.disabled = true;
        btn.textContent = 'Saving Changes...';

        const newName = $('edit-name').value.trim();
        const newPhoto = $('edit-photo').value.trim();
        const newBio = $('edit-bio').value.trim();
        const newTwitter = $('edit-twitter').value.trim();
        const newGithub = $('edit-github').value.trim();
        const newLinkedin = $('edit-linkedin').value.trim();

        // 1. Update Auth Profile
        await updateProfile(user, {
            displayName: newName,
            photoURL: newPhoto || `https://i.pravatar.cc/150?u=${user.uid}`
        });

        // 2. Update Firestore Extended Profile
        await updateUserProfile({
            displayName: newName,
            photoURL: newPhoto || `https://i.pravatar.cc/150?u=${user.uid}`,
            bio: newBio,
            socials: {
                twitter: newTwitter,
                github: newGithub,
                linkedin: newLinkedin
            }
        });

        // 3. Refresh UI
        await renderProfileData(user);
        alert('Profile updated successfully!');

    } catch (err) {
        console.error('Profile update failed:', err);
        alert('Failed to update profile: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Profile Changes';
    }
});

// Avatar Change Simulation (URL only for now)
$('avatar-input')?.addEventListener('change', async (e) => {
    alert("Image upload requires Firebase Storage. For now, name and bio changes are supported!");
});
