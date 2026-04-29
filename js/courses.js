const CoursesService = {
    coursesCache: [],
    
    _subscriptions: {},
    _unsubscribers: [],
    
    subscribeToCourses(callback) {
        console.log('[REAL-TIME] Subscribing to courses...');
        
        const unsubscribe = db.collection(COLLECTIONS.COURSES)
            .where('isFree', '==', true)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                const courses = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()
                }));
                
                this.coursesCache = courses;
                console.log(`[REAL-TIME] Received ${courses.length} courses`);
                
                if (callback) callback(courses);
                
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        showToast(`Yangi kurs qo'shildi: ${change.doc.data().title}`, 'success');
                    }
                });
            }, (error) => {
                console.error('[REAL-TIME] Subscription error:', error);
            });
        
        this._unsubscribers.push(unsubscribe);
        return unsubscribe;
    },
    
    subscribeToLessons(courseId, callback) {
        console.log(`[REAL-TIME] Subscribing to lessons for course: ${courseId}`);
        
        const unsubscribe = db.collection(COLLECTIONS.COURSES)
            .doc(courseId)
            .collection(COLLECTIONS.LESSONS)
            .orderBy('orderIndex')
            .onSnapshot((snapshot) => {
                const lessons = snapshot.docs.map(doc => ({
                    id: doc.id,
                    courseId: courseId,
                    ...doc.data()
                }));
                
                console.log(`[REAL-TIME] Received ${lessons.length} lessons`);
                
                if (callback) callback(lessons);
                
                // Notify about new videos
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added' && change.doc.data().videoUrl) {
                        showToast(`Yangi video qo'shildi!`, 'success');
                    }
                });
            }, (error) => {
                console.error('[REAL-TIME] Lessons subscription error:', error);
            });
        
        this._unsubscribers.push(unsubscribe);
        return unsubscribe;
    },
    
    // Unsubscribe from all real-time updates
    unsubscribeAll() {
        console.log('[REAL-TIME] Unsubscribing from all updates...');
        this._unsubscribers.forEach(unsub => unsub());
        this._unsubscribers = [];
    },
    
    // Get all courses (one-time fetch)
    async getCourses() {
        try {
            showLoading();
            
            const snapshot = await db.collection(COLLECTIONS.COURSES)
                .where('isFree', '==', true)
                .orderBy('createdAt', 'desc')
                .get();
            
            const courses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate()
            }));
            
            this.coursesCache = courses;
            hideLoading();
            return courses;
        } catch (error) {
            hideLoading();
            console.error('Get courses error:', error);
            showToast('Kurslarni yuklashda xatolik', 'error');
            return [];
        }
    },

    // Get course by ID
    async getCourse(courseId) {
        try {
            const doc = await db.collection(COLLECTIONS.COURSES).doc(courseId).get();
            
            if (doc.exists) {
                return {
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate()
                };
            }
            return null;
        } catch (error) {
            console.error('Get course error:', error);
            return null;
        }
    },

    // Get lessons for a course
    async getLessons(courseId) {
        try {
            const snapshot = await db.collection(COLLECTIONS.COURSES)
                .doc(courseId)
                .collection(COLLECTIONS.LESSONS)
                .orderBy('orderIndex')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                courseId: courseId,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Get lessons error:', error);
            return [];
        }
    },

    // Get categories
    async getCategories() {
        try {
            const snapshot = await db.collection(COLLECTIONS.CATEGORIES)
                .orderBy('name')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Get categories error:', error);
            return [];
        }
    },

    // Render courses to grid
    renderCourses(courses) {
        const grid = document.getElementById('coursesGrid');
        const loading = document.getElementById('coursesLoading');
        
        if (!grid) return;
        
        // Hide loading state
        if (loading) loading.style.display = 'none';
        
        // If no courses, just hide the grid (don't show empty message on main page)
        if (courses.length === 0) {
            grid.style.display = 'none';
            return;
        }
        
        // If courses exist, show grid
        grid.style.display = 'grid';
        
        grid.innerHTML = courses.map(course => this.createCourseCard(course)).join('');
        
        // Add click handlers for bookmarks
        document.querySelectorAll('.course-bookmark').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggleBookmark(btn.dataset.courseId);
                btn.classList.toggle('active');
            });
        });
    },

    // Create course card HTML
    createCourseCard(course) {
        const duration = this.formatDuration(course.totalDuration);
        const lessonsCount = course.lessonCount || 0;
        
        return `
            <div class="course-card animate-fade-in">
                <div class="course-thumbnail">
                    <img src="${course.thumbnail || 'https://via.placeholder.com/640x360?text=AlgoLearn'}" 
                         alt="${course.title}" loading="lazy">
                    ${course.isFree ? '<span class="course-badge">Bepul</span>' : ''}
                    <button class="course-bookmark" data-course-id="${course.id}">
                        <i class="far fa-bookmark"></i>
                    </button>
                </div>
                <div class="course-content">
                    <span class="course-category">${course.category || 'Dasturlash'}</span>
                    <h3 class="course-title">${course.title}</h3>
                    <p class="course-description">${course.description || ''}</p>
                    <div class="course-meta">
                        <span><i class="fas fa-play-circle"></i> ${lessonsCount} dars</span>
                        <span><i class="fas fa-clock"></i> ${duration}</span>
                    </div>
                    <div class="course-footer">
                        <div class="course-author">
                            <img src="https://via.placeholder.com/32?text=A" alt="${course.authorName || 'Admin'}">
                            <span>${course.authorName || 'AlgoLearn'}</span>
                        </div>
                        <a href="pages/course.html?id=${course.id}" class="btn btn-primary btn-sm">
                            Boshlash
                        </a>
                    </div>
                </div>
            </div>
        `;
    },

    // Filter courses by category
    filterCourses(courses, filter) {
        if (filter === 'all') return courses;
        
        return courses.filter(course => {
            const category = (course.category || '').toLowerCase();
            const tags = (course.tags || []).map(t => t.toLowerCase());
            const filterLower = filter.toLowerCase();
            
            return category.includes(filterLower) || 
                   tags.some(tag => tag.includes(filterLower));
        });
    },

    // Search courses
    searchCourses(courses, query) {
        if (!query) return courses;
        
        const queryLower = query.toLowerCase();
        
        return courses.filter(course => {
            const title = (course.title || '').toLowerCase();
            const description = (course.description || '').toLowerCase();
            const category = (course.category || '').toLowerCase();
            
            return title.includes(queryLower) || 
                   description.includes(queryLower) || 
                   category.includes(queryLower);
        });
    },

    // Toggle bookmark
    async toggleBookmark(courseId) {
        const user = auth.currentUser;
        if (!user) {
            showToast('Iltimos, avval tizimga kiring', 'warning');
            return;
        }
        
        try {
            const userRef = db.collection(COLLECTIONS.USERS).doc(user.uid);
            const userDoc = await userRef.get();
            const bookmarks = userDoc.data()?.bookmarks || [];
            
            if (bookmarks.includes(courseId)) {
                // Remove bookmark
                await userRef.update({
                    bookmarks: firebase.firestore.FieldValue.arrayRemove(courseId)
                });
                showToast('Sevimlilardan olib tashlandi', 'info');
            } else {
                // Add bookmark
                await userRef.update({
                    bookmarks: firebase.firestore.FieldValue.arrayUnion(courseId)
                });
                showToast('Sevimlilarga qo\'shildi', 'success');
            }
        } catch (error) {
            console.error('Toggle bookmark error:', error);
            showToast('Xatolik yuz berdi', 'error');
        }
    },

    // Enroll in course
    async enrollInCourse(courseId) {
        const user = auth.currentUser;
        if (!user) {
            showToast('Iltimos, avval tizimga kiring', 'warning');
            window.location.href = 'login.html';
            return;
        }
        
        try {
            showLoading();
            
            // Check if already enrolled
            const enrollmentQuery = await db.collection(COLLECTIONS.ENROLLMENTS)
                .where('userId', '==', user.uid)
                .where('courseId', '==', courseId)
                .get();
            
            if (!enrollmentQuery.empty) {
                hideLoading();
                showToast('Siz allaqachon bu kursga yozilgansiz', 'info');
                return;
            }
            
            // Create enrollment
            await db.collection(COLLECTIONS.ENROLLMENTS).add({
                userId: user.uid,
                courseId: courseId,
                enrolledAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastAccessedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update user's enrolled courses
            await db.collection(COLLECTIONS.USERS).doc(user.uid).update({
                enrolledCourses: firebase.firestore.FieldValue.arrayUnion(courseId)
            });
            
            // Create progress record
            await db.collection(COLLECTIONS.PROGRESS).add({
                userId: user.uid,
                courseId: courseId,
                completedLessons: [],
                percentage: 0,
                startedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            hideLoading();
            showToast('Kursga muvaffaqiyatli yozildingiz!', 'success');
        } catch (error) {
            hideLoading();
            console.error('Enroll error:', error);
            showToast('Yozilishda xatolik', 'error');
        }
    },

    // Format duration (minutes to hours:minutes)
    formatDuration(minutes) {
        if (!minutes) return '0 daq';
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours > 0) {
            return `${hours} soat ${mins > 0 ? mins + ' daq' : ''}`;
        }
        return `${mins} daq`;
    }
};

// Initialize courses on page load
document.addEventListener('DOMContentLoaded', async () => {
    const coursesGrid = document.getElementById('coursesGrid');
    
    if (coursesGrid) {
        // Load and render courses
        const courses = await CoursesService.getCourses();
        CoursesService.renderCourses(courses);
        
        // Setup filter buttons
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Filter courses
                const filter = btn.dataset.filter;
                const filtered = CoursesService.filterCourses(courses, filter);
                CoursesService.renderCourses(filtered);
            });
        });
    }
});

// Make available globally
window.CoursesService = CoursesService;
