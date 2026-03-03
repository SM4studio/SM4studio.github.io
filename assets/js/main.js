/**
 * main.js — Core application logic
 * Handles: header behaviour, mobile nav, scroll effects,
 *           lazy loading, animations, newsletter form, etc.
 */

/* ─── DOM Utilities ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ─── Mobile Navigation ─────────────────────────────────────── */
function initMobileNav() {
    const toggle = $('mobile-toggle');
    const mobileNav = $('mobile-nav');
    if (!toggle || !mobileNav) return;

    toggle.addEventListener('click', () => {
        const isOpen = mobileNav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
        toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    // Close when clicking outside
    document.addEventListener('click', e => {
        if (!toggle.contains(e.target) && !mobileNav.contains(e.target)) {
            mobileNav.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
}

/* ─── Scroll to Top Button ──────────────────────────────────── */
function initScrollTop() {
    const btn = $('scroll-top');
    if (!btn) return;

    const toggle = () => {
        btn.classList.toggle('visible', window.scrollY > 400);
    };

    window.addEventListener('scroll', toggle, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ─── Reading Progress Bar ─────────────────── */
function initReadingProgress() {
    const bar = $('reading-progress');
    if (!bar) return;

    window.addEventListener('scroll', () => {
        const docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scroll = window.scrollY;
        const pct = docH > 0 ? (scroll / docH) * 100 : 0;
        bar.style.width = pct + '%';
    }, { passive: true });
}

/* ─── Theme Toggle (Dark/Light) ────────────────────────────── */
function initThemeToggle() {
    const btn = $('theme-toggle');
    const body = document.body;
    if (!btn) return;

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);

    btn.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Track analytics
        try {
            import('./auth.js').then(({ analytics, logEvent }) => {
                if (analytics) logEvent(analytics, 'theme_change', { theme: newTheme });
            });
        } catch (err) { }
    });
}

/* ─── Scroll-reveal Animations ──────────────────────────────── */
function initFadeIn() {
    const obs = new IntersectionObserver(
        entries => {
            entries.forEach(el => {
                if (el.isIntersecting) {
                    el.target.classList.add('visible');
                    obs.unobserve(el.target);
                }
            });
        },
        { threshold: 0.06, rootMargin: '0px 0px -30px 0px' }
    );
    $$('.fade-in').forEach(el => obs.observe(el));
}

/* Observe newly added dynamic elements */
function observeNewElements() {
    $$('.fade-in:not(.observed)').forEach(el => {
        el.classList.add('observed');
        // Force reflow so transition fires
        requestAnimationFrame(() => {
            el.classList.add('visible');
        });
    });
}

/* ─── Active Navigation Link ────────────────────────────────── */
function setActiveNav() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    $$('.nav-links a, .mobile-nav a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(path)) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

/* ─── Newsletter Form ───────────────────────────────────────── */
function initNewsletterForms() {
    $$('.newsletter-form').forEach(form => {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const emailInput = form.querySelector('input[type="email"]');
            const btn = form.querySelector('button');
            const email = emailInput?.value.trim();
            if (!email) return;

            try {
                btn.disabled = true;
                btn.innerHTML = 'Subscribing... <i data-lucide="loader" class="animate-spin"></i>';
                if (window.lucide) lucide.createIcons();

                const { db, collection, addDoc, serverTimestamp, analytics, logEvent } = await import('./auth.js');

                // 1. Save to Firestore
                await addDoc(collection(db, 'subscribers'), {
                    email: email,
                    source: form.closest('aside') ? 'sidebar' : 'footer',
                    timestamp: serverTimestamp()
                });

                // 2. Track Analytics Event
                if (analytics) {
                    logEvent(analytics, 'newsletter_signup', {
                        form_location: form.closest('aside') ? 'sidebar' : 'footer'
                    });
                }

                // 3. UI Update
                btn.textContent = '✓ Subscribed!';
                btn.style.background = '#D1FAE5';
                btn.style.color = '#065F46';
                emailInput.value = '';

                setTimeout(() => {
                    btn.textContent = 'Subscribe →';
                    btn.disabled = false;
                    btn.style.background = '';
                    btn.style.color = '';
                    if (window.lucide) lucide.createIcons();
                }, 4000);

            } catch (err) {
                console.error('Newsletter error:', err);
                if (err.code === 'permission-denied') {
                    btn.textContent = 'Setup Error: Check Rules';
                } else {
                    btn.textContent = 'Error! Try again.';
                }
                btn.disabled = false;
            }
        });
    });
}

/* ─── Newsletter Pop-up ─────────────────────────────────────── */
function initNewsletterPopup() {
    const popup = $('newsletter-popup');
    if (!popup || localStorage.getItem('newsletter_dismissed')) return;

    let shown = false;
    window.addEventListener('scroll', () => {
        if (shown) return;
        const scrollPct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

        if (scrollPct > 40) { // Show after 40% scroll
            shown = true;
            setTimeout(() => {
                popup.classList.add('active');
            }, 1000);
        }
    }, { passive: true });

    $('popup-close')?.addEventListener('click', () => {
        popup.classList.remove('active');
        localStorage.setItem('newsletter_dismissed', 'true');
    });
}

/* ─── Contact Form ──────────────────────────────────────────── */
function initContactForm() {
    const form = $('contact-form');
    const success = $('form-success');
    if (!form) return;

    form.addEventListener('submit', e => {
        e.preventDefault();
        const submitBtn = form.querySelector('[type="submit"]');
        submitBtn.textContent = 'Sending…';
        submitBtn.disabled = true;

        setTimeout(() => {
            if (success) success.classList.add('show');
            form.reset();
            submitBtn.textContent = 'Send Message';
            submitBtn.disabled = false;
        }, 1200);
    });
}

/* ─── Copy Link (Share bar) ─────────────────────────────────── */
function initShareBar() {
    const copyBtn = $('share-copy');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);

            // Analytics
            try {
                const { analytics, logEvent } = await import('./auth.js');
                if (analytics) {
                    logEvent(analytics, 'share', {
                        method: 'clipboard',
                        content_type: 'article',
                        item_id: window.location.search
                    });
                }
            } catch (err) { }

            // UX Feedback
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i data-lucide="check" style="color:#10b981"></i>';
            if (window.lucide) lucide.createIcons();

            copyBtn.classList.add('copied');

            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                if (window.lucide) lucide.createIcons();
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Clipboard error:', err);
            copyBtn.innerHTML = '<i data-lucide="alert-circle" style="color:#ef4444"></i>';
            if (window.lucide) lucide.createIcons();
        }
    });
}

/* ─── Header Shadow on Scroll ───────────────────────────────── */
function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
        header.style.boxShadow = window.scrollY > 10
            ? '0 2px 20px rgba(0,0,0,.08)'
            : 'var(--shadow-sm)';
    }, { passive: true });
}

/* ─── Lazy Load Images (native + fallback) ──────────────────── */
function initLazyImages() {
    if ('loading' in HTMLImageElement.prototype) return; // native support

    const lazyImages = $$('img[loading="lazy"]');
    if (!lazyImages.length) return;

    const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) { img.src = img.dataset.src; }
                obs.unobserve(img);
            }
        });
    }, { rootMargin: '200px 0px' });

    lazyImages.forEach(img => obs.observe(img));
}

/* ─── Index page: Render posts grid ────────────────────────── */
async function renderPostsGrid() {
    const grid = $('posts-grid');
    if (!grid) return;

    // Show loading state
    grid.innerHTML = '<div class="no-results"><div class="icon">⌛</div><h3>Loading posts…</h3></div>';

    await loadPosts();

    const filtered = filterPosts(ALL_POSTS);
    const { posts, totalPages, currentPage } = paginatePosts(
        filtered,
        SearchState.currentPage,
        SearchState.postsPerPage
    );

    // Filter feedback
    const feedbackWrap = $('filter-feedback');
    if (feedbackWrap) {
        if (SearchState.tag || SearchState.query) {
            const label = SearchState.tag ? `Tag: <strong>${SearchState.tag}</strong>` : `Search: <strong>${SearchState.query}</strong>`;
            feedbackWrap.innerHTML = `
                <div class="filter-status">
                    <span>Showing results for ${label}</span>
                    <button onclick="clearAllFilters()" class="clear-filter-btn">Clear All <i data-lucide="x"></i></button>
                </div>
            `;
            feedbackWrap.style.display = 'block';
        } else {
            feedbackWrap.innerHTML = '';
            feedbackWrap.style.display = 'none';
        }
    }

    if (posts.length === 0) {
        grid.innerHTML = `
      <div class="no-results">
        <div class="icon">🔍</div>
        <h3>No posts found</h3>
        <p>Try a different keyword or category.</p>
      </div>`;
        $('pagination-wrap').innerHTML = '';
        return;
    }

    grid.innerHTML = posts.map(renderPostCard).join('');

    // Pagination
    const paginationWrap = $('pagination-wrap');
    if (paginationWrap) {
        paginationWrap.innerHTML = renderPagination(currentPage, totalPages, page => {
            SearchState.currentPage = page;
            renderPostsGrid();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Animate cards in
    observeNewElements();

    // Initialize icons
    if (window.lucide) lucide.createIcons();
}

/* ─── Index page: Render sidebar ───────────────────────────── */
async function renderSidebar() {
    await loadPosts();

    // Recent posts
    const recentList = $('sidebar-recent');
    if (recentList) {
        const recent = getRecentPosts(5);
        recentList.innerHTML = recent.map(renderRecentPostItem).join('');
    }

    // Category counts
    const catList = $('sidebar-cats');
    if (catList) {
        const cats = getCategoryCounts();
        const allCount = ALL_POSTS.length;
        catList.innerHTML = `
      <div class="cat-pill" onclick="filterByCategory('all')">
        <span>All Posts</span>
        <span class="cat-count">${allCount}</span>
      </div>` +
            cats.map(c => `
      <div class="cat-pill" onclick="filterByCategory('${c.name}')">
        <span>${c.name}</span>
        <span class="cat-count">${c.count}</span>
      </div>`).join('');
    }

    // Tags cloud
    const tagsWrap = $('sidebar-tags');
    if (tagsWrap) {
        const tags = getAllTags();
        tagsWrap.innerHTML = tags.map(t =>
            `<span class="tag-chip" onclick="filterByTag('${t}')">${t}</span>`
        ).join('');
    }

    // Manual Ad Zone in Sidebar
    const adZone = $('sidebar-ad-slot');
    if (adZone) {
        adZone.innerHTML = `
            <div class="ad-zone ad-sidebar">
                <div class="ad-inline">
                    <p>SPONSORED CONTENT</p>
                    <!-- AdSense Unit Placeholder -->
                </div>
            </div>
        `;
    }

    // Initialize icons
    if (window.lucide) lucide.createIcons();
}

/* Helper called from sidebar category click */
function filterByCategory(cat) {
    SearchState.category = cat;
    SearchState.tag = ''; // Clear tag filter when changing category
    SearchState.currentPage = 1;
    // Update active state on category buttons
    $$('.cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === cat);
    });

    // Track Analytics Category Click
    try {
        import('./auth.js').then(({ analytics, logEvent }) => {
            logEvent(analytics, 'select_content', {
                content_type: 'category',
                item_id: cat
            });
        });
    } catch (err) { }

    renderPostsGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Helper called from tag chip click */
function filterByTag(tag) {
    // If we're not on index.html, redirect
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && !window.location.pathname.endsWith('index')) {
        window.location.href = `index.html?tag=${encodeURIComponent(tag)}`;
        return;
    }
    SearchState.tag = tag;
    SearchState.query = ''; // Clear search query when filtering by tag
    SearchState.currentPage = 1;

    // Update category UI to 'all' if tag filter is active
    SearchState.category = 'all';
    $$('.cat-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.cat === 'all'));

    // Track Analytics Tag Click
    try {
        import('./auth.js').then(({ analytics, logEvent }) => {
            logEvent(analytics, 'select_content', {
                content_type: 'tag',
                item_id: tag
            });
        });
    } catch (err) { }

    renderPostsGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearAllFilters() {
    SearchState.query = '';
    SearchState.tag = '';
    SearchState.category = 'all';
    SearchState.currentPage = 1;
    $$('.cat-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.cat === 'all'));
    const input = document.querySelector('.header-search input');
    if (input) input.value = '';
    renderPostsGrid();
}

/* ─── Hero featured post (index.html) ──────────────────────── */
async function renderHeroFeatured() {
    const card = $('hero-featured');
    if (!card) return;
    await loadPosts();
    const featured = getFeaturedPosts()[0] || ALL_POSTS[0];
    if (!featured) return;

    card.innerHTML = `
    <div class="hero-featured-card" onclick="window.location='post.html?id=${featured.id}'"
      role="link" tabindex="0" aria-label="Read: ${featured.title}">
      <img src="${featured.image}" alt="${featured.title}" loading="lazy" width="800" height="280">
      <div class="hero-card-body">
        <div class="hero-card-meta">
          <span class="badge badge-${featured.category.toLowerCase()}">${featured.category}</span>
          <span>${featured.date}</span>
          <span>·</span>
          <span>${featured.readTime}</span>
        </div>
        <h3 class="hero-card-title">${featured.title}</h3>
      </div>
    </div>`;

    // Initialize icons
    if (window.lucide) lucide.createIcons();
}

/* ─── Single post page (post.html) ─────────────────────────── */
async function renderSinglePost() {
    const postContent = $('post-content');
    if (!postContent) return;

    await loadPosts();
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const post = getPostById(id);

    if (!post) {
        window.location.href = '404.html';
        return;
    }

    // Track analytics view_item
    try {
        const { analytics, logEvent } = await import('./auth.js');
        logEvent(analytics, 'view_item', {
            item_id: post.id,
            item_name: post.title,
            item_category: post.category
        });
    } catch (err) { console.error('Analytics error:', err); }

    // Update <title> and meta
    document.title = `${post.title} | The Pulse Blog`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = post.excerpt;

    // OG tags
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', post.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', post.excerpt);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', post.imageFull);

    const catClass = post.category.toLowerCase();

    // Check if current user is the author
    let adminHtml = '';
    const { auth, db, doc, deleteDoc } = await import('./auth.js');
    if (auth.currentUser && String(auth.currentUser.uid) === String(post.authorId)) {
        adminHtml = `
            <div class="admin-actions">
                <a href="create-post.html?edit=${post.id}" class="btn btn-edit"><i data-lucide="edit-3"></i> Edit Post</a>
                <button class="btn btn-delete" id="delete-post-btn"><i data-lucide="trash-2"></i> Delete Post</button>
            </div>
        `;
    }

    // Gated Content Logic
    let bodyContent = post.content;
    const isLocked = post.isPremium && !auth.currentUser;

    if (isLocked) {
        // Show only the first 2 paragraphs as a teaser
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = post.content;
        const paragraphs = Array.from(tempDiv.querySelectorAll('p')).slice(0, 2);
        const teaser = paragraphs.map(p => p.outerHTML).join('');

        bodyContent = `
            <div class="article-teaser">
                ${teaser}
            </div>
            <div class="content-gate">
                <div class="gate-overlay">
                    <div class="gate-card">
                        <div class="gate-icon"><i data-lucide="lock"></i></div>
                        <h3>This is a Member-Only Article</h3>
                        <p>Join our community of knowledge seekers to unlock this deep-dive and gain unlimited access to all premium content.</p>
                        <div class="gate-actions">
                            <button class="btn btn-primary" onclick="document.getElementById('auth-btn').click()">Sign In / Sign Up</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    postContent.innerHTML = `
    <!-- Admin Actions -->
    ${adminHtml}
    
    <!-- Breadcrumb -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="index.html">Home</a>
      <span class="breadcrumb-sep"><i data-lucide="chevron-right"></i></span>
      <a href="index.html?cat=${post.category}">${post.category}</a>
      <span class="breadcrumb-sep"><i data-lucide="chevron-right"></i></span>
      <span>${post.title}</span>
    </nav>

    <header class="post-header">
      <div style="display: flex; gap: 8px; margin-bottom: 20px;">
        <span class="badge badge-${catClass}">${post.category}</span>
        ${post.isPremium ? `<span class="badge-premium"><i data-lucide="lock"></i> Member Only</span>` : ''}
      </div>
      <h1 class="post-main-title">${post.title}</h1>
      <div class="post-meta-bar">
        <div class="author-meta">
          <img src="${post.authorAvatar}" alt="${post.author}" width="40" height="40">
          <div>
            <strong>${post.author}</strong>
          </div>
        </div>
        <span class="meta-sep">·</span>
        <time datetime="${post.dateISO}">${post.date}</time>
        <span class="meta-sep">·</span>
        <span class="read-time"><i data-lucide="clock"></i> ${post.readTime}</span>
      </div>
    </header>

    <figure class="post-cover">
      <img src="${post.imageFull || post.image}" alt="${post.title}" loading="eager" width="1200" height="600">
    </figure>

    <div class="article-body">
      ${bodyContent}
    </div>

    ${!isLocked ? `
    <div class="post-tags">
      <h4 class="post-tag-label">Tags:</h4>
      <div class="tags-cloud">
        ${(post.tags || []).map(t => `<span class="tag-chip" style="cursor:pointer" onclick="filterByTag('${t}')">${t}</span>`).join('')}
      </div>
    </div>

    <div class="share-bar">
      <span class="share-label">Share this article:</span>
      <div class="share-btns">
        <a class="share-btn twitter" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}" target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter"><i data-lucide="twitter"></i></a>
        <a class="share-btn facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook"><i data-lucide="facebook"></i></a>
        <a class="share-btn linkedin" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn"><i data-lucide="linkedin"></i></a>
        <button class="share-btn copy" id="share-copy" title="Copy link" aria-label="Copy article link"><i data-lucide="link"></i></button>
      </div>
    </div>

    <!-- Author Card -->
    <div class="author-card">
      <img src="${post.authorAvatar}" alt="${post.author}" class="author-avatar-large">
      <div class="author-details">
        <h3>About ${post.author}</h3>
        <p>A passionate writer and expert in ${post.category}. Bringing you the latest insights and deep-dives from around the world.</p>
        <div class="author-socials">
          <a href="#"><i data-lucide="globe"></i></a>
          <a href="#"><i data-lucide="twitter"></i></a>
          <a href="#"><i data-lucide="mail"></i></a>
        </div>
      </div>
    </div>
    
    <div class="comments-section" id="comments">
      <div class="comments-header">
        <h3><i data-lucide="message-square"></i> Discussion</h3>
        <span id="comment-count-display">${post.commentCount || 0} Comments</span>
      </div>

      <div id="comment-input-area">
        <!-- Filled by JS based on Auth -->
      </div>

      <div class="comments-list" id="comments-list">
        <div style="text-align:center; padding: 2rem; color: var(--color-text-muted);">
          <i data-lucide="loader" class="animate-spin" style="margin-bottom: 8px;"></i>
          <p>Loading conversation...</p>
        </div>
      </div>
    </div>
    ` : ''}
    `;

    // Render sidebar recent posts
    const sidebarRecent = $('post-sidebar-recent');
    if (sidebarRecent) {
        const recent = getRecentPosts(5, post.id);
        sidebarRecent.innerHTML = recent.map(renderRecentPostItem).join('');
    }

    // Init share functionality
    initShareBar();
    initComments(post.id);
    observeNewElements();

    // Manual Ad Zone in Sidebar (Single Post)
    const adZone = $('sidebar-ad-slot');
    if (adZone) {
        adZone.innerHTML = `
            <div class="ad-zone ad-sidebar">
                <div class="ad-inline">
                    <p>SPONSORED CONTENT</p>
                    <!-- AdSense Unit Placeholder -->
                </div>
            </div>
        `;
    }

    // Delete post logic
    const deleteBtn = document.getElementById('delete-post-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this post? This cannot be undone.')) {
                try {
                    const { db, doc, deleteDoc } = await import('./auth.js');
                    await deleteDoc(doc(db, 'posts', post.id));
                    alert('Post deleted successfully.');
                    window.location.href = 'index.html';
                } catch (err) {
                    console.error('Delete failed:', err);
                    alert('Failed to delete post.');
                }
            }
        });
    }

    // Initialize icons
    if (window.lucide) lucide.createIcons();
}

/* ─── App Init ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    // Universal inits
    initMobileNav();
    initScrollTop();
    initReadingProgress();
    initThemeToggle();
    initFadeIn();
    setActiveNav();
    initNewsletterForms();
    initNewsletterPopup();
    initContactForm();
    initHeaderScroll();
    initLazyImages();
    if (typeof initSearchOverlay === 'function') initSearchOverlay();
    if (typeof initIndexFilters === 'function') initIndexFilters();

    // Page-specific inits
    const page = window.location.pathname.split('/').pop() || 'index.html';

    if (page === 'index.html' || page === '' || page === '/') {
        await Promise.all([
            renderHeroFeatured(),
            renderPostsGrid(),
            renderSidebar(),
        ]);
    }

    if (page === 'post.html') {
        await renderSinglePost();
    }

    // Universal Page View Tracking
    try {
        import('./auth.js').then(({ analytics, logEvent }) => {
            logEvent(analytics, 'page_view', {
                page_path: window.location.pathname,
                page_title: document.title
            });
        });
    } catch (err) { }
});

/*  Comments Logic  */
async function initComments(postId) {
    const inputArea = document.getElementById('comment-input-area');
    const listArea = document.getElementById('comments-list');
    if (!inputArea || !listArea) return;

    // Convert postId to string for consistent querying
    const pid = String(postId).trim();
    console.log(`[Comments] Initializing for post: ${pid}`);

    const { auth, db, collection, addDoc, query, where, orderBy, serverTimestamp, onAuthStateChanged, onSnapshot } = await import('./auth.js');

    // 1. Handle Auth State for Input
    onAuthStateChanged(auth, (user) => {
        if (user) {
            inputArea.innerHTML = `
                <div class="comment-input-wrap">
                    <img src="${user.photoURL || 'https://i.pravatar.cc/150?u=' + user.uid}" alt="You" class="user-avatar-small">
                    <form class="comment-form" id="post-comment-form">
                        <textarea id="comment-textarea" placeholder="Join the discussion…" required></textarea>
                        <div class="comment-form-actions">
                            <button type="submit" class="btn btn-primary" id="submit-comment">Post Comment</button>
                        </div>
                    </form>
                </div>
            `;

            const form = document.getElementById('post-comment-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const textarea = document.getElementById('comment-textarea');
                    const content = textarea.value.trim();
                    if (!content) return;

                    const btn = document.getElementById('submit-comment');
                    try {
                        btn.disabled = true;
                        btn.textContent = 'Posting…';

                        await addDoc(collection(db, 'comments'), {
                            postId: pid,
                            uid: user.uid,
                            userName: user.displayName || 'Anonymous Reader',
                            userAvatar: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
                            content: content,
                            timestamp: serverTimestamp()
                        });

                        textarea.value = '';
                        console.log('[Comments] Comment posted successfully');
                    } catch (err) {
                        console.error('[Comments] Post error:', err);
                        alert('Could not post comment. Please try again.');
                    } finally {
                        btn.disabled = false;
                        btn.textContent = 'Post Comment';
                    }
                });
            }
        } else {
            inputArea.innerHTML = `
                <div class="comment-gate">
                    <div class="gate-icon" style="width: 50px; height: 50px; background: var(--color-bg-soft); display: flex; align-items: center; justify-content: center; border-radius: 50%;"><i data-lucide="message-circle"></i></div>
                    <p>Have something to say? Sign in to join the conversation and share your thoughts with the community.</p>
                    <button class="btn btn-primary" id="signin-to-comment">Sign In to Comment</button>
                </div>
            `;
            const signInBtn = document.getElementById('signin-to-comment');
            if (signInBtn) {
                signInBtn.addEventListener('click', () => {
                    const authBtn = document.getElementById('auth-btn');
                    if (authBtn) authBtn.click();
                });
            }
        }
        if (window.lucide) lucide.createIcons();
    });

    // 2. Fetch and Render Comments (Real-time)
    function subscribeToComments() {
        // Query only with postId to avoid requiring a composite index for orderBy
        const q = query(
            collection(db, 'comments'),
            where('postId', '==', pid)
        );

        console.log(`[Comments] Subscribing to comments for postId: ${pid}`);

        return onSnapshot(q, (snap) => {
            let comments = [];
            snap.forEach(doc => {
                const data = doc.data();
                comments.push({ id: doc.id, ...data });
            });

            // Sort manually in JS to avoid "Query requires an index" error
            comments.sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp || 0);
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp || 0);
                return timeB - timeA; // Descending
            });

            console.log(`[Comments] Received and sorted ${comments.length} comments`);

            // Update count
            const countDisplay = document.getElementById('comment-count-display');
            if (countDisplay) countDisplay.textContent = `${comments.length} Comments`;

            if (comments.length === 0) {
                listArea.innerHTML = `
                    <div style="text-align:center; padding: 4rem 1rem; color: var(--color-text-muted); background: var(--color-bg-soft); border-radius: 20px;">
                        <i data-lucide="message-square" style="width:40px; height:40px; opacity:0.2; margin-bottom:1rem;"></i>
                        <p style="font-size: 1.1rem; font-weight: 500;">No comments yet.</p>
                        <p style="font-size: 0.9rem; margin-top: 5px;">Be the first to share your thoughts!</p>
                    </div>
                `;
            } else {
                listArea.innerHTML = comments.map(c => {
                    // Resilient date handling
                    let dateStr = 'Just now';
                    if (c.timestamp) {
                        try {
                            const date = c.timestamp.toDate ? c.timestamp.toDate() : new Date(c.timestamp);
                            dateStr = date.toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            });
                        } catch (e) {
                            console.warn('[Comments] Invalid timestamp for comment:', c.id);
                        }
                    }

                    return `
                        <div class="comment-item">
                            <img src="${c.userAvatar || 'https://i.pravatar.cc/150'}" alt="${c.userName}" class="user-avatar-small">
                            <div class="comment-body">
                                <div class="comment-meta">
                                    <span class="comment-author-name">${c.userName || 'Anonymous'}</span>
                                    <span class="comment-date">· ${dateStr}</span>
                                </div>
                                <div class="comment-text">${c.content}</div>
                                <div class="comment-actions">
                                    <button class="comment-action-btn"><i data-lucide="thumbs-up" style="width:14px;"></i> Like</button>
                                    <button class="comment-action-btn"><i data-lucide="corner-up-left" style="width:14px;"></i> Reply</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            if (window.lucide) lucide.createIcons();
        }, (err) => {
            console.error('[Comments] Subscription error:', err);
            // If it's an index error, the error message often contains a link
            if (err.message && err.message.includes('index')) {
                listArea.innerHTML = '<p style="color:var(--color-primary); text-align:center; padding: 2rem;">Wait... The database is being optimized. Comments will appear shortly.</p>';
            } else {
                listArea.innerHTML = '<p style="color:var(--color-primary); text-align:center; padding: 2rem;">Unable to load conversation. Refreshing may help.</p>';
            }
        });
    }

    subscribeToComments();
}
