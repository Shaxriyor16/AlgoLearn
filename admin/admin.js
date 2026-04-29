// ============================================
// ALGOLEARN ADMIN PANEL - MAIN JAVASCRIPT
// ============================================

// Global state
let currentPage = 'dashboard';
let coursesData = [];
let usersData = [];
let categoriesData = [];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initEventListeners();
    
    // Check authentication
    auth.onAuthStateChanged((user) => {
        if (user) {
            checkAdminRole(user.uid);
        } else {
            window.location.href = '../pages/login.html';
        }
    });
});

// Check if user is admin
async function checkAdminRole(uid) {
    try {
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
        if (userDoc.exists && userDoc.data().role === 'admin') {
            loadDashboardData();
            initRealtimeListeners();
        } else {
            showToast('Sizda admin huquqlari yo\'q', 'error');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
        }
    } catch (error) {
        console.error('Error checking admin role:', error);
        showToast('Xatolik yuz berdi', 'error');
    }
}

// ============================================
// THEME MANAGEMENT
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem('admin-theme') || 'light';
    setTheme(savedTheme);
    
    document.getElementById('themeToggle').addEventListener('click', () => {
        const current = localStorage.getItem('admin-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        setTheme(next);
    });
}

function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i>';
    }
    localStorage.setItem('admin-theme', theme);
}

// ============================================
// NAVIGATION
// ============================================
function initNavigation() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateToPage(page);
        });
    });
    
    // Mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.querySelector('.admin-sidebar').classList.toggle('active');
    });
}

function navigateToPage(page) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => {
        p.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(page + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update page title
    const pageTitles = {
        dashboard: 'Dashboard',
        courses: 'Kurslar',
        lessons: 'Darslar',
        videos: 'Videolar',
        quizzes: 'Testlar',
        users: 'Foydalanuvchilar',
        categories: 'Kategoriyalar'
    };
    document.getElementById('pageTitle').textContent = pageTitles[page] || page;
    
    // Load page data
    currentPage = page;
    switch(page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'courses':
            loadCourses();
            break;
        case 'users':
            loadUsers();
            break;
        case 'categories':
            loadCategories();
            break;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function initEventListeners() {
    // Add new button
    document.getElementById('addNewBtn').addEventListener('click', () => {
        switch(currentPage) {
            case 'courses':
                showAddCourseModal();
                break;
            case 'categories':
                showAddCategoryModal();
                break;
            default:
                showToast('Bu sahifa uchun qo\'shish funksiyasi mavjud emas', 'info');
        }
    });
    
    // Course form submit
    document.getElementById('courseForm').addEventListener('submit', handleCourseSubmit);
    
    // Category form submit
    document.getElementById('categoryForm').addEventListener('submit', handleCategorySubmit);
    
    // Search boxes
    document.getElementById('courseSearch')?.addEventListener('input', debounce(handleCourseSearch, 300));
    document.getElementById('userSearch')?.addEventListener('input', debounce(handleUserSearch, 300));
    
    // Filters
    document.getElementById('categoryFilter')?.addEventListener('change', handleCourseFilter);
    document.getElementById('statusFilter')?.addEventListener('change', handleCourseFilter);
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboardData() {
    try {
        showLoading();
        
        // Get counts
        const usersSnap = await db.collection(COLLECTIONS.USERS).get();
        const coursesSnap = await db.collection(COLLECTIONS.COURSES).get();
        
        let totalLessons = 0;
        for (const courseDoc of coursesSnap.docs) {
            const lessonsSnap = await db.collection(COLLECTIONS.COURSES)
                .doc(courseDoc.id)
                .collection(COLLECTIONS.LESSONS)
                .get();
            totalLessons += lessonsSnap.size;
        }
        
        // Update stats
        document.getElementById('totalUsers').textContent = usersSnap.size;
        document.getElementById('totalCourses').textContent = coursesSnap.size;
        document.getElementById('totalLessons').textContent = totalLessons;
        
        // Load recent users
        const recentUsers = usersSnap.docs
            .slice(0, 5)
            .map(doc => ({ id: doc.id, ...doc.data() }));
        renderRecentUsers(recentUsers);
        
        // Load popular courses
        const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPopularCourses(courses.slice(0, 5));
        
        hideLoading();
    } catch (error) {
        console.error('Load dashboard error:', error);
        hideLoading();
        showToast('Ma\'lumotlarni yuklashda xatolik', 'error');
    }
}

function renderRecentUsers(users) {
    const container = document.getElementById('recentUsers');
    if (!container) return;
    
    container.innerHTML = users.map(user => `
        <div class="user-item">
            <img src="${user.avatarUrl || 'https://via.placeholder.com/44?text=' + user.name.charAt(0)}" alt="${user.name}">
            <div class="user-info">
                <span class="user-name">${user.name}</span>
                <span class="user-email">${user.email}</span>
            </div>
            <span class="user-date">${formatDate(user.createdAt)}</span>
        </div>
    `).join('');
}

function renderPopularCourses(courses) {
    const container = document.getElementById('popularCourses');
    if (!container) return;
    
    container.innerHTML = courses.map(course => `
        <tr>
            <td>
                <div class="table-course">
                    <img src="${course.thumbnail || 'https://via.placeholder.com/48x36'}" alt="${course.title}">
                    <span>${course.title}</span>
                </div>
            </td>
            <td>${course.category || '-'}</td>
            <td>${course.enrolledCount || 0}</td>
            <td>⭐ ${course.rating || 0}</td>
            <td>
                <span class="badge ${course.isPublished ? 'badge-success' : 'badge-warning'}">
                    ${course.isPublished ? 'Faol' : 'Qoralama'}
                </span>
            </td>
        </tr>
    `).join('');
}

// ============================================
// COURSES
// ============================================
async function loadCourses() {
    try {
        showLoading();
        const snapshot = await db.collection(COLLECTIONS.COURSES)
            .orderBy('createdAt', 'desc')
            .get();
        
        coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCourses(coursesData);
        
        // Load categories for filter
        await loadCategoriesForFilter();
        
        hideLoading();
    } catch (error) {
        console.error('Load courses error:', error);
        hideLoading();
        showToast('Kurslarni yuklashda xatolik', 'error');
    }
}

function renderCourses(courses) {
    const container = document.getElementById('coursesGrid');
    if (!container) return;
    
    if (courses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <h3>Hozircha kurslar yo'q</h3>
                <p>Yangi kurs qo'shish uchun "Yangi qo'shish" tugmasini bosing</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courses.map(course => `
        <div class="admin-course-card">
            <div class="admin-course-header">
                <img src="${course.thumbnail || 'https://via.placeholder.com/640x360?text=No+Image'}" alt="${course.title}">
                <div class="admin-course-actions">
                    <button class="action-icon" onclick="editCourse('${course.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-icon delete" onclick="deleteCourse('${course.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="admin-course-body">
                <h4>${course.title}</h4>
                <div class="admin-course-meta">
                    <span><i class="fas fa-folder"></i> ${course.category || '-'}</span>
                    <span><i class="fas fa-play-circle"></i> ${course.lessonCount || 0} dars</span>
                </div>
                <div class="admin-course-footer">
                    <span class="badge ${course.isPublished ? 'badge-success' : 'badge-warning'}">
                        ${course.isPublished ? 'Faol' : 'Qoralama'}
                    </span>
                    <span class="badge ${course.isFree ? 'badge-success' : 'badge-default'}">
                        ${course.isFree ? 'Bepul' : 'Pullik'}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadCategoriesForFilter() {
    try {
        const snapshot = await db.collection(COLLECTIONS.CATEGORIES).get();
        categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const select = document.getElementById('categoryFilter');
        const modalSelect = document.querySelector('select[name="category"]');
        
        const options = categoriesData.map(cat => 
            `<option value="${cat.name}">${cat.name}</option>`
        ).join('');
        
        if (select) {
            select.innerHTML = '<option value="">Barcha kategoriyalar</option>' + options;
        }
        if (modalSelect) {
            modalSelect.innerHTML = '<option value="">Tanlang</option>' + options;
        }
    } catch (error) {
        console.error('Load categories error:', error);
    }
}

function showAddCourseModal() {
    document.getElementById('courseModalTitle').textContent = 'Yangi kurs';
    document.getElementById('courseForm').reset();
    document.getElementById('courseForm').dataset.mode = 'add';
    delete document.getElementById('courseForm').dataset.courseId;
    document.getElementById('thumbnailPreview').innerHTML = '';
    openModal('courseModal');
}

function editCourse(courseId) {
    const course = coursesData.find(c => c.id === courseId);
    if (!course) return;
    
    document.getElementById('courseModalTitle').textContent = 'Kursni tahrirlash';
    document.getElementById('courseForm').dataset.mode = 'edit';
    document.getElementById('courseForm').dataset.courseId = courseId;
    
    // Fill form
    document.querySelector('input[name="title"]').value = course.title || '';
    document.querySelector('select[name="category"]').value = course.category || '';
    document.querySelector('textarea[name="description"]').value = course.description || '';
    document.querySelector('input[name="tags"]').value = (course.tags || []).join(', ');
    document.querySelector('input[name="isFree"]').checked = course.isFree !== false;
    document.querySelector('input[name="isPublished"]').checked = course.isPublished || false;
    
    if (course.thumbnail) {
        document.getElementById('thumbnailPreview').innerHTML = `
            <img src="${course.thumbnail}" alt="Thumbnail" style="max-width: 200px; border-radius: 0.5rem; margin-top: 1rem;">
        `;
    }
    
    openModal('courseModal');
}

async function handleCourseSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const mode = form.dataset.mode;
    const courseId = form.dataset.courseId;
    
    const formData = {
        title: form.querySelector('input[name="title"]').value,
        category: form.querySelector('select[name="category"]').value,
        description: form.querySelector('textarea[name="description"]').value,
        tags: form.querySelector('input[name="tags"]').value.split(',').map(t => t.trim()).filter(t => t),
        isFree: form.querySelector('input[name="isFree"]').checked,
        isPublished: form.querySelector('input[name="isPublished"]').checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        showLoading();
        
        // Handle thumbnail upload
        const thumbnailFile = form.querySelector('input[name="thumbnail"]').files[0];
        if (thumbnailFile) {
            const storageRef = storage.ref(`thumbnails/${Date.now()}_${thumbnailFile.name}`);
            await storageRef.put(thumbnailFile);
            formData.thumbnail = await storageRef.getDownloadURL();
        }
        
        if (mode === 'edit' && courseId) {
            // Update existing course
            await db.collection(COLLECTIONS.COURSES).doc(courseId).update(formData);
            showToast('Kurs yangilandi!', 'success');
        } else {
            // Create new course
            formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            formData.authorId = auth.currentUser.uid;
            formData.authorName = auth.currentUser.displayName || 'Admin';
            formData.lessonCount = 0;
            formData.totalDuration = 0;
            
            await db.collection(COLLECTIONS.COURSES).add(formData);
            showToast('Kurs qo\'shildi!', 'success');
        }
        
        closeModal('courseModal');
        loadCourses();
        hideLoading();
    } catch (error) {
        console.error('Save course error:', error);
        hideLoading();
        showToast('Xatolik yuz berdi', 'error');
    }
}

async function deleteCourse(courseId) {
    if (!confirm('Bu kursni o\'chirishni xohlaysizmi?')) return;
    
    try {
        showLoading();
        await db.collection(COLLECTIONS.COURSES).doc(courseId).delete();
        showToast('Kurs o\'chirildi', 'success');
        loadCourses();
        hideLoading();
    } catch (error) {
        console.error('Delete course error:', error);
        hideLoading();
        showToast('O\'chirishda xatolik', 'error');
    }
}

function handleCourseSearch(e) {
    const query = e.target.value.toLowerCase();
    const filtered = coursesData.filter(course => 
        course.title.toLowerCase().includes(query) ||
        (course.description && course.description.toLowerCase().includes(query))
    );
    renderCourses(filtered);
}

function handleCourseFilter() {
    const category = document.getElementById('categoryFilter')?.value;
    const status = document.getElementById('statusFilter')?.value;
    
    let filtered = coursesData;
    
    if (category) {
        filtered = filtered.filter(c => c.category === category);
    }
    
    if (status) {
        filtered = filtered.filter(c => 
            status === 'active' ? c.isPublished : !c.isPublished
        );
    }
    
    renderCourses(filtered);
}

// ============================================
// USERS
// ============================================
async function loadUsers() {
    try {
        showLoading();
        const snapshot = await db.collection(COLLECTIONS.USERS).get();
        usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderUsers(usersData);
        hideLoading();
    } catch (error) {
        console.error('Load users error:', error);
        hideLoading();
        showToast('Foydalanuvchilarni yuklashda xatolik', 'error');
    }
}

function renderUsers(users) {
    const container = document.getElementById('usersTable');
    if (!container) return;
    
    container.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="table-course">
                    <img src="${user.avatarUrl || 'https://via.placeholder.com/40?text=' + user.name.charAt(0)}" alt="${user.name}">
                    <span>${user.name}</span>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="badge ${user.role === 'admin' ? 'badge-success' : 'badge-default'}">
                    ${user.role || 'student'}
                </span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <span class="badge badge-success">Faol</span>
            </td>
            <td>
                <button class="action-icon" onclick="viewUser('${user.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function handleUserSearch(e) {
    const query = e.target.value.toLowerCase();
    const filtered = usersData.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
    renderUsers(filtered);
}

// ============================================
// CATEGORIES
// ============================================
async function loadCategories() {
    try {
        showLoading();
        const snapshot = await db.collection(COLLECTIONS.CATEGORIES)
            .orderBy('name')
            .get();
        
        categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCategories(categoriesData);
        hideLoading();
    } catch (error) {
        console.error('Load categories error:', error);
        hideLoading();
        showToast('Kategoriyalarni yuklashda xatolik', 'error');
    }
}

function renderCategories(categories) {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;
    
    container.innerHTML = categories.map(cat => `
        <div class="stat-card" style="border-left-color: ${cat.color || 'rgb(var(--primary-500))}'}">
            <div class="stat-icon" style="background-color: ${cat.color || 'rgb(var(--primary-500))'}20; color: ${cat.color || 'rgb(var(--primary-600))}'}">
                <i class="fas fa-tag"></i>
            </div>
            <div class="stat-info">
                <span class="stat-value">${cat.name}</span>
                <span class="stat-label">${cat.courseCount || 0} kurs</span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="action-icon" onclick="editCategory('${cat.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-icon delete" onclick="deleteCategory('${cat.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function showAddCategoryModal() {
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryForm').dataset.mode = 'add';
    delete document.getElementById('categoryForm').dataset.categoryId;
    openModal('categoryModal');
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const mode = form.dataset.mode;
    const categoryId = form.dataset.categoryId;
    
    const formData = {
        name: form.querySelector('input[name="name"]').value,
        description: form.querySelector('textarea[name="description"]').value,
        color: form.querySelector('input[name="color"]').value,
        courseCount: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        showLoading();
        
        if (mode === 'edit' && categoryId) {
            await db.collection(COLLECTIONS.CATEGORIES).doc(categoryId).update(formData);
            showToast('Kategoriya yangilandi!', 'success');
        } else {
            await db.collection(COLLECTIONS.CATEGORIES).add(formData);
            showToast('Kategoriya qo\'shildi!', 'success');
        }
        
        closeModal('categoryModal');
        loadCategories();
        hideLoading();
    } catch (error) {
        console.error('Save category error:', error);
        hideLoading();
        showToast('Xatolik yuz berdi', 'error');
    }
}

// ============================================
// REALTIME LISTENERS
// ============================================
function initRealtimeListeners() {
    // Listen for new courses
    db.collection(COLLECTIONS.COURSES)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' && currentPage === 'dashboard') {
                    showToast('Yangi kurs qo\'shildi!', 'info');
                    loadDashboardData();
                }
            });
        });
    
    // Listen for new users
    db.collection(COLLECTIONS.USERS)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' && currentPage === 'dashboard') {
                    loadDashboardData();
                }
            });
        });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const colors = {
        success: 'var(--success-500)',
        error: 'var(--error-500)',
        warning: 'var(--warning-500)',
        info: 'var(--primary-500)'
    };
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.borderLeft = `4px solid rgb(${colors[type]})`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}" style="color: rgb(${colors[type]})"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('uz-UZ', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = '../index.html';
    });
}

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Thumbnail preview
document.getElementById('thumbnailInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('thumbnailPreview').innerHTML = `
                <img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 0.5rem; margin-top: 1rem;">
            `;
        };
        reader.readAsDataURL(file);
    }
});
