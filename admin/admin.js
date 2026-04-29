// ============================================
// ALGOLEARN ADMIN PANEL - MAIN JAVASCRIPT
// ============================================

// Global state
let currentPage = 'dashboard';
let coursesData = [];
let usersData = [];
let categoriesData = [];
let lessonsData = [];
let quizzesData = [];
let videosData = [];

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
            window.location.href = 'login.html';
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
        case 'lessons':
            loadLessons();
            break;
        case 'videos':
            loadVideos();
            break;
        case 'quizzes':
            loadQuizzes();
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
            case 'lessons':
                showAddLessonModal();
                break;
            case 'videos':
                document.getElementById('videoInput').click();
                break;
            case 'quizzes':
                showAddQuizModal();
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
    document.getElementById('quizSearch')?.addEventListener('input', debounce(handleQuizSearch, 300));
    document.getElementById('quizCourseFilter')?.addEventListener('change', handleQuizFilter);
    document.getElementById('quizLessonFilter')?.addEventListener('change', handleQuizFilter);
    
    // Videos
    document.getElementById('videoSearch')?.addEventListener('input', debounce(handleVideoSearch, 300));
    document.getElementById('videoCourseFilter')?.addEventListener('change', handleVideoFilter);
    document.getElementById('videoLessonFilter')?.addEventListener('change', handleVideoFilter);
    document.getElementById('videoSelectBtn')?.addEventListener('click', () => document.getElementById('videoInput').click());
    document.getElementById('videoInput')?.addEventListener('change', handleVideoUpload);
    
    // Drag & drop
    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => uploadZone.classList.add('drag-active'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('drag-active'), false);
        });
        
        uploadZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleVideoUpload({ target: { files: files } });
            }
        }, false);
    }
    
    // Filters
    document.getElementById('categoryFilter')?.addEventListener('change', handleCourseFilter);
    document.getElementById('statusFilter')?.addEventListener('change', handleCourseFilter);
    document.getElementById('lessonSearch')?.addEventListener('input', debounce(handleLessonSearch, 300));
    document.getElementById('lessonCourseFilter')?.addEventListener('change', handleLessonFilter);
    
    // Lesson form submit
    document.getElementById('lessonForm')?.addEventListener('submit', handleLessonSubmit);
    
    // Quiz form submit
    document.getElementById('quizForm')?.addEventListener('submit', handleQuizSubmit);
    
    // Bepul/Pullik toggle label switch
    const isFreeCheckbox = document.querySelector('input[name="isFree"]');
    if (isFreeCheckbox) {
        const updateFreeLabel = () => {
            const label = isFreeCheckbox.closest('label.toggle')?.querySelector('span');
            if (label) label.textContent = isFreeCheckbox.checked ? 'Bepul' : 'Pullik';
        };
        isFreeCheckbox.addEventListener('change', updateFreeLabel);
        updateFreeLabel();
    }
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

async function showAddCourseModal() {
    document.getElementById('courseModalTitle').textContent = 'Yangi kurs';
    document.getElementById('courseForm').reset();
    document.getElementById('courseForm').dataset.mode = 'add';
    delete document.getElementById('courseForm').dataset.courseId;
    document.getElementById('thumbnailPreview').innerHTML = '';
    await loadCategoriesForFilter();
    // Reset Bepul label
    const isFreeCheckbox = document.querySelector('input[name="isFree"]');
    const label = isFreeCheckbox?.closest('label.toggle')?.querySelector('span');
    if (label) label.textContent = 'Bepul';
    openModal('courseModal');
}

async function editCourse(courseId) {
    const course = coursesData.find(c => c.id === courseId);
    if (!course) return;
    
    await loadCategoriesForFilter();
    
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
    
    // Update Bepul/Pullik label
    const isFreeCheckbox = document.querySelector('input[name="isFree"]');
    const freeLabel = isFreeCheckbox?.closest('label.toggle')?.querySelector('span');
    if (freeLabel) freeLabel.textContent = course.isFree !== false ? 'Bepul' : 'Pullik';
    
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
// LESSONS
// ============================================
async function loadLessons() {
    try {
        showLoading();
        const coursesSnap = await db.collection(COLLECTIONS.COURSES).get();
        let allLessons = [];
        
        for (const courseDoc of coursesSnap.docs) {
            const lessonsSnap = await db.collection(COLLECTIONS.COURSES)
                .doc(courseDoc.id)
                .collection(COLLECTIONS.LESSONS)
                .orderBy('orderIndex')
                .get();
            
            lessonsSnap.docs.forEach(doc => {
                allLessons.push({
                    id: doc.id,
                    courseId: courseDoc.id,
                    courseTitle: courseDoc.data().title,
                    ...doc.data()
                });
            });
        }
        
        lessonsData = allLessons;
        renderLessons(allLessons);
        
        // Load courses for filter
        const courseSelect = document.getElementById('lessonCourseFilter');
        if (courseSelect) {
            const options = coursesSnap.docs.map(doc => 
                `<option value="${doc.id}">${doc.data().title}</option>`
            ).join('');
            courseSelect.innerHTML = '<option value="">Barcha kurslar</option>' + options;
        }
        
        // Load courses for modal
        const modalCourseSelect = document.getElementById('lessonCourseSelect');
        if (modalCourseSelect) {
            const options = coursesSnap.docs.map(doc => 
                `<option value="${doc.id}">${doc.data().title}</option>`
            ).join('');
            modalCourseSelect.innerHTML = '<option value="">Kursni tanlang...</option>' + options;
        }
        
        hideLoading();
    } catch (error) {
        console.error('Load lessons error:', error);
        hideLoading();
        showToast('Darslarni yuklashda xatolik', 'error');
    }
}

function renderLessons(lessons) {
    const container = document.getElementById('lessonsGrid');
    if (!container) return;
    
    if (lessons.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-play-circle"></i>
                <h3>Hozircha darslar yo'q</h3>
                <p>Yangi dars qo'shish uchun "Dars qo'shish" tugmasini bosing</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = lessons.map(lesson => `
        <div class="admin-course-card">
            <div class="admin-course-header">
                <div class="admin-course-actions">
                    <button class="action-icon" onclick="editLesson('${lesson.courseId}', '${lesson.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-icon delete" onclick="deleteLesson('${lesson.courseId}', '${lesson.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="admin-course-body">
                <h4>${lesson.title}</h4>
                <div class="admin-course-meta">
                    <span><i class="fas fa-book"></i> ${lesson.courseTitle || '-'}</span>
                    <span><i class="fas fa-clock"></i> ${lesson.duration || 0} daq</span>
                </div>
                <div class="admin-course-footer">
                    <span class="badge badge-default">Tartib: ${lesson.orderIndex || 0}</span>
                    <span class="badge ${lesson.hasQuiz ? 'badge-success' : 'badge-warning'}">
                        ${lesson.hasQuiz ? 'Test bor' : 'Test yo\'q'}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

async function showAddLessonModal() {
    document.getElementById('lessonModalTitle').textContent = 'Yangi dars';
    document.getElementById('lessonForm').reset();
    document.getElementById('lessonForm').dataset.mode = 'add';
    delete document.getElementById('lessonForm').dataset.lessonId;
    delete document.getElementById('lessonForm').dataset.courseId;
    
    // Reset video inputs visibility
    toggleVideoInput();
    toggleQuizSettings();
    
    // Load courses for select
    const coursesSnap = await db.collection(COLLECTIONS.COURSES).get();
    const select = document.getElementById('lessonCourseSelect');
    if (select) {
        const options = coursesSnap.docs.map(doc => 
            `<option value="${doc.id}">${doc.data().title}</option>`
        ).join('');
        select.innerHTML = '<option value="">Kursni tanlang...</option>' + options;
    }
    
    openModal('lessonModal');
}

async function handleLessonSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const mode = form.dataset.mode;
    const courseId = form.dataset.courseId || form.querySelector('select[name="courseSelect"]').value;
    const lessonId = form.dataset.lessonId;
    
    if (!courseId) {
        showToast('Iltimos, kursni tanlang', 'error');
        return;
    }
    
    const formData = {
        title: form.querySelector('input[name="title"]').value,
        description: form.querySelector('textarea[name="description"]').value,
        orderIndex: parseInt(form.querySelector('input[name="orderIndex"]').value) || 1,
        duration: parseInt(form.querySelector('input[name="duration"]').value) || 15,
        hasQuiz: form.querySelector('input[name="hasQuiz"]')?.checked || false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Handle video source
    const videoType = form.querySelector('select[name="videoType"]')?.value || 'storage';
    if (videoType === 'youtube') {
        formData.videoUrl = form.querySelector('input[name="youtubeUrl"]')?.value || '';
        formData.videoType = 'youtube';
    } else if (videoType === 'url') {
        formData.videoUrl = form.querySelector('input[name="videoUrl"]')?.value || '';
        formData.videoType = 'url';
    }
    // For storage, videoUrl will be set after upload (future implementation)
    
    try {
        showLoading();
        
        if (mode === 'edit' && lessonId) {
            await db.collection(COLLECTIONS.COURSES).doc(courseId)
                .collection(COLLECTIONS.LESSONS).doc(lessonId).update(formData);
            showToast('Dars yangilandi!', 'success');
        } else {
            formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection(COLLECTIONS.COURSES).doc(courseId)
                .collection(COLLECTIONS.LESSONS).add(formData);
            showToast('Dars qo\'shildi!', 'success');
            
            // Update course lesson count
            const lessonsSnap = await db.collection(COLLECTIONS.COURSES).doc(courseId)
                .collection(COLLECTIONS.LESSONS).get();
            await db.collection(COLLECTIONS.COURSES).doc(courseId).update({
                lessonCount: lessonsSnap.size
            });
        }
        
        closeModal('lessonModal');
        loadLessons();
        hideLoading();
    } catch (error) {
        console.error('Save lesson error:', error);
        hideLoading();
        showToast('Xatolik yuz berdi', 'error');
    }
}

async function editLesson(courseId, lessonId) {
    try {
        const doc = await db.collection(COLLECTIONS.COURSES).doc(courseId)
            .collection(COLLECTIONS.LESSONS).doc(lessonId).get();
        
        if (!doc.exists) {
            showToast('Dars topilmadi', 'error');
            return;
        }
        
        const lesson = doc.data();
        
        document.getElementById('lessonModalTitle').textContent = 'Darsni tahrirlash';
        document.getElementById('lessonForm').dataset.mode = 'edit';
        document.getElementById('lessonForm').dataset.lessonId = lessonId;
        document.getElementById('lessonForm').dataset.courseId = courseId;
        
        // Load courses and set selected
        const coursesSnap = await db.collection(COLLECTIONS.COURSES).get();
        const select = document.getElementById('lessonCourseSelect');
        if (select) {
            const options = coursesSnap.docs.map(doc => 
                `<option value="${doc.id}" ${doc.id === courseId ? 'selected' : ''}>${doc.data().title}</option>`
            ).join('');
            select.innerHTML = '<option value="">Kursni tanlang...</option>' + options;
        }
        
        // Fill form
        document.querySelector('#lessonForm input[name="title"]').value = lesson.title || '';
        document.querySelector('#lessonForm textarea[name="description"]').value = lesson.description || '';
        document.querySelector('#lessonForm input[name="orderIndex"]').value = lesson.orderIndex || 1;
        document.querySelector('#lessonForm input[name="duration"]').value = lesson.duration || 15;
        document.querySelector('#lessonForm input[name="hasQuiz"]').checked = lesson.hasQuiz || false;
        
        // Video type
        const videoType = lesson.videoType || 'storage';
        const videoTypeSelect = document.querySelector('#lessonForm select[name="videoType"]');
        if (videoTypeSelect) videoTypeSelect.value = videoType;
        
        if (videoType === 'youtube') {
            const ytInput = document.querySelector('#lessonForm input[name="youtubeUrl"]');
            if (ytInput) ytInput.value = lesson.videoUrl || '';
        } else if (videoType === 'url') {
            const urlInput = document.querySelector('#lessonForm input[name="videoUrl"]');
            if (urlInput) urlInput.value = lesson.videoUrl || '';
        }
        
        toggleVideoInput();
        toggleQuizSettings();
        
        openModal('lessonModal');
    } catch (error) {
        console.error('Edit lesson error:', error);
        showToast('Darsni yuklashda xatolik', 'error');
    }
}

async function deleteLesson(courseId, lessonId) {
    if (!confirm('Bu darsni o\'chirishni xohlaysizmi?')) return;
    
    try {
        showLoading();
        await db.collection(COLLECTIONS.COURSES).doc(courseId)
            .collection(COLLECTIONS.LESSONS).doc(lessonId).delete();
        
        // Update course lesson count
        const lessonsSnap = await db.collection(COLLECTIONS.COURSES).doc(courseId)
            .collection(COLLECTIONS.LESSONS).get();
        await db.collection(COLLECTIONS.COURSES).doc(courseId).update({
            lessonCount: lessonsSnap.size
        });
        
        showToast('Dars o\'chirildi', 'success');
        loadLessons();
        hideLoading();
    } catch (error) {
        console.error('Delete lesson error:', error);
        hideLoading();
        showToast('O\'chirishda xatolik', 'error');
    }
}

function toggleVideoInput() {
    const videoType = document.getElementById('videoType')?.value || 'storage';
    const storageUpload = document.getElementById('storageUpload');
    const youtubeInput = document.getElementById('youtubeInput');
    const urlInput = document.getElementById('urlInput');
    
    if (storageUpload) storageUpload.style.display = videoType === 'storage' ? 'block' : 'none';
    if (youtubeInput) youtubeInput.style.display = videoType === 'youtube' ? 'block' : 'none';
    if (urlInput) urlInput.style.display = videoType === 'url' ? 'block' : 'none';
}

function toggleQuizSettings() {
    const hasQuiz = document.getElementById('hasQuizCheckbox')?.checked || false;
    const quizSettings = document.getElementById('quizSettings');
    if (quizSettings) {
        quizSettings.style.display = hasQuiz ? 'block' : 'none';
        quizSettings.style.opacity = hasQuiz ? '1' : '0.6';
        quizSettings.style.pointerEvents = hasQuiz ? 'auto' : 'none';
    }
}

function handleLessonSearch(e) {
    const query = e.target.value.toLowerCase();
    const filtered = lessonsData.filter(lesson => 
        lesson.title?.toLowerCase().includes(query) ||
        (lesson.description && lesson.description.toLowerCase().includes(query))
    );
    renderLessons(filtered);
}

function handleLessonFilter() {
    const courseId = document.getElementById('lessonCourseFilter')?.value;
    
    let filtered = lessonsData;
    
    if (courseId) {
        filtered = filtered.filter(l => l.courseId === courseId);
    }
    
    renderLessons(filtered);
}

// ============================================
// VIDEOS
// ============================================
async function loadVideos() {
    try {
        showLoading();
        
        // Load all videos from lessons subcollections
        let allVideos = [];
        const coursesSnap = await db.collection(COLLECTIONS.COURSES).get();
        
        for (const courseDoc of coursesSnap.docs) {
            const lessonsSnap = await db.collection(COLLECTIONS.COURSES)
                .doc(courseDoc.id)
                .collection(COLLECTIONS.LESSONS)
                .get();
            
            for (const lessonDoc of lessonsSnap.docs) {
                const lesson = lessonDoc.data();
                // Check if lesson has videoUrl or videoType
                if (lesson.videoUrl) {
                    allVideos.push({
                        id: lessonDoc.id,
                        courseId: courseDoc.id,
                        courseTitle: courseDoc.data().title,
                        lessonId: lessonDoc.id,
                        lessonTitle: lesson.title,
                        videoUrl: lesson.videoUrl,
                        videoType: lesson.videoType || 'storage',
                        thumbnail: courseDoc.data().thumbnail,
                        duration: lesson.duration || 0,
                        updatedAt: lesson.updatedAt
                    });
                }
            }
        }
        
        // Also check dedicated videos collection if exists
        try {
            const videosSnap = await db.collection('videos').orderBy('createdAt', 'desc').get();
            videosSnap.docs.forEach(doc => {
                const v = doc.data();
                allVideos.push({
                    id: doc.id,
                    ...v,
                    videoUrl: v.url || v.videoUrl,
                    lessonTitle: v.lessonTitle || 'Noma\'lum dars',
                    courseTitle: v.courseTitle || 'Noma\'lum kurs'
                });
            });
        } catch (e) {
            // videos collection may not exist
        }
        
        videosData = allVideos;
        renderVideos(allVideos);
        
        // Load filters
        const courseSelect = document.getElementById('videoCourseFilter');
        if (courseSelect) {
            const options = coursesSnap.docs.map(doc => 
                `<option value="${doc.id}">${doc.data().title}</option>`
            ).join('');
            courseSelect.innerHTML = '<option value="">Barcha kurslar</option>' + options;
        }
        
        let allLessons = [];
        for (const courseDoc of coursesSnap.docs) {
            const lessonsSnap = await db.collection(COLLECTIONS.COURSES)
                .doc(courseDoc.id)
                .collection(COLLECTIONS.LESSONS)
                .get();
            lessonsSnap.docs.forEach(d => {
                allLessons.push({ id: d.id, title: d.data().title, courseId: courseDoc.id });
            });
        }
        
        const lessonSelect = document.getElementById('videoLessonFilter');
        if (lessonSelect) {
            const options = allLessons.map(l => 
                `<option value="${l.id}">${l.title}</option>`
            ).join('');
            lessonSelect.innerHTML = '<option value="">Barcha darslar</option>' + options;
        }
        
        hideLoading();
    } catch (error) {
        console.error('Load videos error:', error);
        hideLoading();
        showToast('Videolarni yuklashda xatolik: ' + error.message, 'error');
    }
}

function renderVideos(videos) {
    const container = document.getElementById('videosGrid');
    if (!container) return;
    
    if (videos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-video"></i>
                <h3>Hozircha videolar yo'q</h3>
                <p>Yuqoridagi "Fayl tanlash" tugmasi orqali video yuklang</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = videos.map(video => `
        <div class="admin-course-card">
            <div class="admin-course-header">
                <video class="video-preview" src="${video.videoUrl}" preload="metadata" poster="${video.thumbnail || ''}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 8px; background: #000;"></video>
                <div class="admin-course-actions" style="top: 8px; right: 8px;">
                    <button class="action-icon delete" onclick="deleteVideo('${video.id}', '${video.courseId}', '${video.lessonId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <span class="badge badge-default" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white;">
                    ${formatDuration(video.duration)}
                </span>
            </div>
            <div class="admin-course-body">
                <h4>${video.lessonTitle || 'Noma\'lum dars'}</h4>
                <div class="admin-course-meta">
                    <span><i class="fas fa-book"></i> ${video.courseTitle || 'Noma\'lum kurs'}</span>
                    <span><i class="fas fa-play-circle"></i> ${video.videoType || 'storage'}</span>
                </div>
                <div class="admin-course-footer">
                    <a href="${video.videoUrl}" target="_blank" class="btn btn-sm btn-outline" style="text-decoration: none;">
                        <i class="fas fa-external-link-alt"></i> Ko'rish
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

async function handleVideoUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    for (const file of files) {
        if (!file.type.startsWith('video/')) {
            showToast('Faqat video fayllar yuklanishi mumkin: ' + file.name, 'warning');
            continue;
        }
        
        // Show upload progress UI
        const uploadItem = document.createElement('div');
        uploadItem.className = 'upload-item';
        uploadItem.innerHTML = `
            <div class="upload-info">
                <i class="fas fa-file-video"></i>
                <span>${file.name}</span>
                <span class="upload-size">(${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            </div>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" id="progress-${file.name.replace(/[^a-z0-9]/gi, '')}"></div>
            </div>
        `;
        
        // Insert after upload zone
        const uploadZone = document.getElementById('uploadZone');
        if (uploadZone && uploadZone.nextElementSibling) {
            uploadZone.parentNode.insertBefore(uploadItem, uploadZone.nextElementSibling);
        }
        
        try {
            const fileName = `videos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storageRef = storage.ref(fileName);
            const uploadTask = storageRef.put(file);
            
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    const fill = document.getElementById(`progress-${file.name.replace(/[^a-z0-9]/gi, '')}`);
                    if (fill) fill.style.width = progress + '%';
                },
                (error) => {
                    console.error('Upload error:', error);
                    showToast('Yuklashda xatolik: ' + file.name, 'error');
                    if (uploadItem) uploadItem.remove();
                },
                async () => {
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    
                    // Save video metadata to Firestore
                    await db.collection('videos').add({
                        name: file.name,
                        url: downloadURL,
                        storagePath: fileName,
                        size: file.size,
                        type: file.type,
                        duration: 0,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    showToast('Video yuklandi: ' + file.name, 'success');
                    if (uploadItem) uploadItem.remove();
                    loadVideos();
                }
            );
        } catch (error) {
            console.error('Video upload error:', error);
            showToast('Yuklashda xatolik: ' + error.message, 'error');
            if (uploadItem) uploadItem.remove();
        }
    }
    
    e.target.value = '';
}

async function deleteVideo(videoId, courseId, lessonId) {
    if (!confirm('Bu videoni o\'chirishni xohlaysizmi?')) return;
    
    try {
        showLoading();
        
        // Try to delete from videos collection first
        try {
            const videoDoc = await db.collection('videos').doc(videoId).get();
            if (videoDoc.exists) {
                const data = videoDoc.data();
                if (data.storagePath) {
                    await storage.ref(data.storagePath).delete();
                }
                await db.collection('videos').doc(videoId).delete();
            }
        } catch (e) {
            // If not in videos collection, it might be in lesson
        }
        
        // Also clear video from lesson if applicable
        if (courseId && lessonId) {
            try {
                await db.collection(COLLECTIONS.COURSES).doc(courseId)
                    .collection(COLLECTIONS.LESSONS).doc(lessonId)
                    .update({
                        videoUrl: firebase.firestore.FieldValue.delete(),
                        videoType: firebase.firestore.FieldValue.delete(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
            } catch (e) {
                // lesson may not have video
            }
        }
        
        showToast('Video o\'chirildi', 'success');
        loadVideos();
        hideLoading();
    } catch (error) {
        console.error('Delete video error:', error);
        hideLoading();
        showToast('O\'chirishda xatolik: ' + error.message, 'error');
    }
}

function handleVideoSearch(e) {
    const query = e.target.value.toLowerCase();
    const filtered = videosData.filter(video => 
        (video.lessonTitle || '').toLowerCase().includes(query) ||
        (video.courseTitle || '').toLowerCase().includes(query)
    );
    renderVideos(filtered);
}

function handleVideoFilter() {
    const courseId = document.getElementById('videoCourseFilter')?.value;
    const lessonId = document.getElementById('videoLessonFilter')?.value;
    
    let filtered = videosData;
    
    if (courseId) {
        filtered = filtered.filter(v => v.courseId === courseId);
    }
    
    if (lessonId) {
        filtered = filtered.filter(v => v.lessonId === lessonId);
    }
    
    renderVideos(filtered);
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// ============================================
// USERS
// ============================================
async function loadUsers() {
    try {
        showLoading();
        console.log('[ADMIN] Loading users from collection:', COLLECTIONS.USERS);
        const snapshot = await db.collection(COLLECTIONS.USERS).get();
        console.log('[ADMIN] Users snapshot size:', snapshot.size);
        
        usersData = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('[ADMIN] User doc:', doc.id, data);
            return { id: doc.id, ...data };
        });
        
        renderUsers(usersData);
        hideLoading();
    } catch (error) {
        console.error('Load users error:', error);
        hideLoading();
        showToast('Foydalanuvchilarni yuklashda xatolik: ' + error.message, 'error');
    }
}

function renderUsers(users) {
    const container = document.getElementById('usersTable');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: rgb(var(--text-secondary));">
                    <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                    Hozircha foydalanuvchilar yo'q
                </td>
            </tr>
        `;
        return;
    }
    
    container.innerHTML = users.map(user => {
        const name = user.name || user.displayName || (user.email ? user.email.split('@')[0] : 'Noma\'lum');
        const email = user.email || '-';
        const role = user.role || 'student';
        const createdAt = formatDate(user.createdAt || user.created_at || user.registeredAt);
        const avatarUrl = user.avatarUrl || user.photoURL || `https://via.placeholder.com/40?text=${encodeURIComponent(name.charAt(0).toUpperCase())}`;
        
        return `
        <tr>
            <td>
                <div class="table-course">
                    <img src="${avatarUrl}" alt="${name}" onerror="this.src='https://via.placeholder.com/40?text=U'">
                    <span>${name}</span>
                </div>
            </td>
            <td>${email}</td>
            <td>
                <span class="badge ${role === 'admin' ? 'badge-success' : 'badge-default'}">
                    ${role}
                </span>
            </td>
            <td>${createdAt}</td>
            <td>
                <span class="badge badge-success">Faol</span>
            </td>
            <td>
                <button class="action-icon" onclick="viewUser('${user.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

function handleUserSearch(e) {
    const query = e.target.value.toLowerCase();
    const filtered = usersData.filter(user => {
        const name = (user.name || user.displayName || user.email || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
    });
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
// QUIZZES
// ============================================
async function loadQuizzes() {
    try {
        showLoading();
        const snapshot = await db.collection(COLLECTIONS.QUIZZES)
            .orderBy('createdAt', 'desc')
            .get();
        
        quizzesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderQuizzes(quizzesData);
        
        // Load courses for filter
        const coursesSnap = await db.collection(COLLECTIONS.COURSES).get();
        const courseSelect = document.getElementById('quizCourseFilter');
        if (courseSelect) {
            const options = coursesSnap.docs.map(doc => 
                `<option value="${doc.id}">${doc.data().title}</option>`
            ).join('');
            courseSelect.innerHTML = '<option value="">Barcha kurslar</option>' + options;
        }
        
        // Load lessons for filter
        let allLessons = [];
        for (const courseDoc of coursesSnap.docs) {
            const lessonsSnap = await db.collection(COLLECTIONS.COURSES)
                .doc(courseDoc.id)
                .collection(COLLECTIONS.LESSONS)
                .get();
            lessonsSnap.docs.forEach(d => {
                allLessons.push({ id: d.id, title: d.data().title, courseId: courseDoc.id });
            });
        }
        const lessonSelect = document.getElementById('quizLessonFilter');
        if (lessonSelect) {
            const options = allLessons.map(l => 
                `<option value="${l.id}">${l.title}</option>`
            ).join('');
            lessonSelect.innerHTML = '<option value="">Barcha darslar</option>' + options;
        }
        
        hideLoading();
    } catch (error) {
        console.error('Load quizzes error:', error);
        hideLoading();
        showToast('Testlarni yuklashda xatolik', 'error');
    }
}

function renderQuizzes(quizzes) {
    const container = document.getElementById('quizzesGrid');
    if (!container) return;
    
    if (quizzes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-question-circle"></i>
                <h3>Hozircha testlar yo'q</h3>
                <p>Yangi test qo'shish uchun "Test qo'shish" tugmasini bosing</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = quizzes.map(quiz => `
        <div class="admin-course-card">
            <div class="admin-course-header">
                <div class="admin-course-actions">
                    <button class="action-icon" onclick="editQuiz('${quiz.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-icon delete" onclick="deleteQuiz('${quiz.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="admin-course-body">
                <h4>${quiz.title}</h4>
                <div class="admin-course-meta">
                    <span><i class="fas fa-clock"></i> ${quiz.timeLimit || 0} daq</span>
                    <span><i class="fas fa-percentage"></i> O'tish: ${quiz.passingScore || 70}%</span>
                </div>
                <div class="admin-course-footer">
                    <span class="badge badge-default">Savollar: ${quiz.questions?.length || 0}</span>
                    <span class="badge ${quiz.isActive !== false ? 'badge-success' : 'badge-warning'}">
                        ${quiz.isActive !== false ? 'Faol' : 'Nofaol'}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

async function showAddQuizModal() {
    document.getElementById('quizModalTitle').textContent = 'Yangi test';
    document.getElementById('quizForm').reset();
    document.getElementById('quizForm').dataset.mode = 'add';
    delete document.getElementById('quizForm').dataset.quizId;
    document.getElementById('questionsContainer').innerHTML = '';
    
    // Load all lessons for select
    const coursesSnap = await db.collection(COLLECTIONS.COURSES).get();
    let allLessons = [];
    for (const courseDoc of coursesSnap.docs) {
        const lessonsSnap = await db.collection(COLLECTIONS.COURSES)
            .doc(courseDoc.id)
            .collection(COLLECTIONS.LESSONS)
            .get();
        lessonsSnap.docs.forEach(d => {
            allLessons.push({ id: d.id, title: d.data().title, courseId: courseDoc.id });
        });
    }
    
    const select = document.getElementById('lessonSelect');
    if (select) {
        const options = allLessons.map(l => 
            `<option value="${l.id}" data-course="${l.courseId}">${l.title}</option>`
        ).join('');
        select.innerHTML = '<option value="">Darsni tanlang...</option>' + options;
    }
    
    openModal('quizModal');
}

async function handleQuizSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const mode = form.dataset.mode;
    const quizId = form.dataset.quizId;
    
    const lessonSelect = form.querySelector('select[name="lessonSelect"]');
    const lessonId = lessonSelect?.value;
    if (!lessonId) {
        showToast('Iltimos, darsni tanlang', 'error');
        return;
    }
    const courseId = lessonSelect.options[lessonSelect.selectedIndex].dataset.course;
    
    // Collect questions
    const questions = [];
    const questionCards = document.querySelectorAll('.question-card');
    questionCards.forEach(card => {
        const text = card.querySelector('.question-text')?.value?.trim();
        if (!text) return;
        
        const options = [];
        card.querySelectorAll('.option-input').forEach((input, idx) => {
            options.push(input.value?.trim() || `Variant ${idx + 1}`);
        });
        
        const correctAnswer = parseInt(card.querySelector('.correct-select')?.value || 0);
        const points = parseInt(card.querySelector('.points-input')?.value || 1);
        
        questions.push({ text, options, correctAnswer, points });
    });
    
    if (questions.length === 0) {
        showToast('Kamida bitta savol qo\'shing', 'error');
        return;
    }
    
    const formData = {
        title: form.querySelector('input[name="title"]').value,
        description: form.querySelector('textarea[name="description"]').value,
        lessonId: lessonId,
        courseId: courseId,
        timeLimit: parseInt(form.querySelector('input[name="timeLimit"]').value) || 10,
        passingScore: parseInt(form.querySelector('input[name="passingScore"]').value) || 70,
        maxAttempts: parseInt(form.querySelector('input[name="maxAttempts"]').value) || 3,
        isActive: form.querySelector('input[name="isActive"]')?.checked !== false,
        questions: questions,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        showLoading();
        
        if (mode === 'edit' && quizId) {
            await db.collection(COLLECTIONS.QUIZZES).doc(quizId).update(formData);
            showToast('Test yangilandi!', 'success');
        } else {
            formData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection(COLLECTIONS.QUIZZES).add(formData);
            showToast('Test qo\'shildi!', 'success');
        }
        
        closeModal('quizModal');
        loadQuizzes();
        hideLoading();
    } catch (error) {
        console.error('Save quiz error:', error);
        hideLoading();
        showToast('Xatolik yuz berdi', 'error');
    }
}

async function editQuiz(quizId) {
    try {
        const doc = await db.collection(COLLECTIONS.QUIZZES).doc(quizId).get();
        if (!doc.exists) {
            showToast('Test topilmadi', 'error');
            return;
        }
        
        const quiz = doc.data();
        
        document.getElementById('quizModalTitle').textContent = 'Testni tahrirlash';
        document.getElementById('quizForm').dataset.mode = 'edit';
        document.getElementById('quizForm').dataset.quizId = quizId;
        
        // Load lessons
        const coursesSnap = await db.collection(COLLECTIONS.COURSES).get();
        let allLessons = [];
        for (const courseDoc of coursesSnap.docs) {
            const lessonsSnap = await db.collection(COLLECTIONS.COURSES)
                .doc(courseDoc.id)
                .collection(COLLECTIONS.LESSONS)
                .get();
            lessonsSnap.docs.forEach(d => {
                allLessons.push({ id: d.id, title: d.data().title, courseId: courseDoc.id });
            });
        }
        
        const select = document.getElementById('lessonSelect');
        if (select) {
            const options = allLessons.map(l => 
                `<option value="${l.id}" data-course="${l.courseId}" ${l.id === quiz.lessonId ? 'selected' : ''}>${l.title}</option>`
            ).join('');
            select.innerHTML = '<option value="">Darsni tanlang...</option>' + options;
        }
        
        // Fill form
        document.querySelector('#quizForm input[name="title"]').value = quiz.title || '';
        document.querySelector('#quizForm textarea[name="description"]').value = quiz.description || '';
        document.querySelector('#quizForm input[name="timeLimit"]').value = quiz.timeLimit || 10;
        document.querySelector('#quizForm input[name="passingScore"]').value = quiz.passingScore || 70;
        document.querySelector('#quizForm input[name="maxAttempts"]').value = quiz.maxAttempts || 3;
        const isActiveCheckbox = document.querySelector('#quizForm input[name="isActive"]');
        if (isActiveCheckbox) isActiveCheckbox.checked = quiz.isActive !== false;
        
        // Render questions
        const container = document.getElementById('questionsContainer');
        container.innerHTML = '';
        (quiz.questions || []).forEach((q, idx) => {
            addQuestionField(q, idx);
        });
        
        openModal('quizModal');
    } catch (error) {
        console.error('Edit quiz error:', error);
        showToast('Testni yuklashda xatolik', 'error');
    }
}

async function deleteQuiz(quizId) {
    if (!confirm('Bu testni o\'chirishni xohlaysizmi?')) return;
    
    try {
        showLoading();
        await db.collection(COLLECTIONS.QUIZZES).doc(quizId).delete();
        showToast('Test o\'chirildi', 'success');
        loadQuizzes();
        hideLoading();
    } catch (error) {
        console.error('Delete quiz error:', error);
        hideLoading();
        showToast('O\'chirishda xatolik', 'error');
    }
}

function addQuestionField(questionData = null, index = null) {
    const container = document.getElementById('questionsContainer');
    const idx = index !== null ? index : container.children.length;
    const q = questionData || { text: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 };
    
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
        <div class="question-header">
            <span class="question-number">Savol ${idx + 1}</span>
            <button type="button" class="action-icon delete" onclick="this.closest('.question-card').remove(); renumberQuestions();">
                <i class="fas fa-trash"></i>
            </button>
        </div>
        <div class="form-group">
            <input type="text" class="form-input question-text" placeholder="Savol matni..." value="${q.text}" required>
        </div>
        <div class="form-row options-row">
            ${q.options.map((opt, i) => `
                <div class="form-group">
                    <input type="text" class="form-input option-input" placeholder="Variant ${i + 1}" value="${opt}" required>
                </div>
            `).join('')}
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>To'g'ri javob</label>
                <select class="form-input correct-select">
                    <option value="0" ${q.correctAnswer === 0 ? 'selected' : ''}>Variant 1</option>
                    <option value="1" ${q.correctAnswer === 1 ? 'selected' : ''}>Variant 2</option>
                    <option value="2" ${q.correctAnswer === 2 ? 'selected' : ''}>Variant 3</option>
                    <option value="3" ${q.correctAnswer === 3 ? 'selected' : ''}>Variant 4</option>
                </select>
            </div>
            <div class="form-group">
                <label>Ball</label>
                <input type="number" class="form-input points-input" value="${q.points}" min="1" max="10">
            </div>
        </div>
    `;
    container.appendChild(card);
}

function renumberQuestions() {
    document.querySelectorAll('.question-card').forEach((card, idx) => {
        card.querySelector('.question-number').textContent = `Savol ${idx + 1}`;
    });
}

function handleQuizSearch(e) {
    const query = e.target.value.toLowerCase();
    const filtered = quizzesData.filter(quiz => 
        quiz.title?.toLowerCase().includes(query) ||
        (quiz.description && quiz.description.toLowerCase().includes(query))
    );
    renderQuizzes(filtered);
}

function handleQuizFilter() {
    const courseId = document.getElementById('quizCourseFilter')?.value;
    const lessonId = document.getElementById('quizLessonFilter')?.value;
    
    let filtered = quizzesData;
    
    if (courseId) {
        filtered = filtered.filter(q => q.courseId === courseId);
    }
    
    if (lessonId) {
        filtered = filtered.filter(q => q.lessonId === lessonId);
    }
    
    renderQuizzes(filtered);
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
    
    try {
        let date;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            // Firestore Timestamp
            date = timestamp.toDate();
        } else if (timestamp.seconds) {
            // Firestore Timestamp object (serialized)
            date = new Date(timestamp.seconds * 1000);
        } else if (typeof timestamp === 'number') {
            // Unix timestamp in ms
            date = new Date(timestamp);
        } else if (typeof timestamp === 'string') {
            // ISO string
            date = new Date(timestamp);
        } else {
            date = new Date(timestamp);
        }
        
        if (isNaN(date.getTime())) return '-';
        
        return date.toLocaleDateString('uz-UZ', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        console.warn('Date parse error:', e, timestamp);
        return '-';
    }
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
