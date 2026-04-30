const AuthService = {
    currentUser: null,

    init() {
        auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                this.updateUIForLoggedInUser(user);
            } else {
                this.updateUIForLoggedOutUser();
            }
        });
    },

    async register(name, email, password) {
        try {
            showLoading();
            
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            await user.updateProfile({ displayName: name });
            
            await db.collection(COLLECTIONS.USERS).doc(user.uid).set({
                name: name,
                email: email,
                role: 'student',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                enrolledCourses: [],
                bookmarks: [],
                progressMap: {},
                lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            hideLoading();
            showToast('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!', 'success');

            // Check for redirect URL
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            sessionStorage.removeItem('redirectAfterLogin');

            // Redirect
            setTimeout(() => {
                window.location.href = redirectUrl || 'dashboard.html';
            }, 1500);

            return user;
        } catch (error) {
            hideLoading();
            console.error('Registration error:', error);
            showToast(this.getErrorMessage(error), 'error');
            throw error;
        }
    },

    // Login with email/password
    async login(email, password) {
        try {
            showLoading();
            
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update last active
            await db.collection(COLLECTIONS.USERS).doc(user.uid).update({
                lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            hideLoading();
            showToast('Tizimga muvaffaqiyatli kirdingiz!', 'success');

            // Check for redirect URL
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            sessionStorage.removeItem('redirectAfterLogin');

            // Redirect
            setTimeout(() => {
                window.location.href = redirectUrl || 'dashboard.html';
            }, 1500);

            return user;
        } catch (error) {
            hideLoading();
            console.error('Login error:', error);
            showToast(this.getErrorMessage(error), 'error');
            throw error;
        }
    },

    // Login with Google
    async loginWithGoogle() {
        try {
            showLoading();
            
            const provider = new firebase.auth.GoogleAuthProvider();
            // Request additional permissions
            provider.addScope('profile');
            provider.addScope('email');
            
            const userCredential = await auth.signInWithPopup(provider);
            const user = userCredential.user;
            
            // Real-time user data sync with Firestore
            await this.syncUserWithFirestore(user, 'google');
            
            hideLoading();
            showToast('Google orqali muvaffaqiyatli kirdingiz!', 'success');

            // Check for redirect URL
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            sessionStorage.removeItem('redirectAfterLogin');

            setTimeout(() => {
                window.location.href = redirectUrl || 'dashboard.html';
            }, 1500);

            return user;
        } catch (error) {
            hideLoading();
            console.error('Google login error:', error);
            showToast(this.getErrorMessage(error), 'error');
            throw error;
        }
    },

    // Login with Apple
    async loginWithApple() {
        try {
            showLoading();
            
            const provider = new firebase.auth.OAuthProvider('apple.com');
            // Request additional scopes
            provider.addScope('email');
            provider.addScope('name');
            
            const userCredential = await auth.signInWithPopup(provider);
            const user = userCredential.user;
            
            // Real-time user data sync with Firestore
            await this.syncUserWithFirestore(user, 'apple');
            
            hideLoading();
            showToast('Apple orqali muvaffaqiyatli kirdingiz!', 'success');

            // Check for redirect URL
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
            sessionStorage.removeItem('redirectAfterLogin');

            setTimeout(() => {
                window.location.href = redirectUrl || 'dashboard.html';
            }, 1500);

            return user;
        } catch (error) {
            hideLoading();
            console.error('Apple login error:', error);
            showToast(this.getErrorMessage(error), 'error');
            throw error;
        }
    },

    // Sync user with Firestore (real-time)
    async syncUserWithFirestore(user, provider) {
        try {
            const userRef = db.collection(COLLECTIONS.USERS).doc(user.uid);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
                // Create new user document with real-time timestamp
                await userRef.set({
                    name: user.displayName || 'Foydalanuvchi',
                    email: user.email,
                    role: 'student',
                    avatarUrl: user.photoURL || '',
                    provider: provider,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
                    enrolledCourses: [],
                    bookmarks: [],
                    progressMap: {},
                    isActive: true
                });
                
                // Log analytics event
                if (analytics) {
                    analytics.logEvent('sign_up', {
                        method: provider,
                        platform: 'web'
                    });
                }
                
                console.log(`[REAL-TIME] New user created via ${provider}:`, user.email);
            } else {
                // Update existing user with real-time sync
                await userRef.update({
                    lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isActive: true,
                    provider: provider
                });
                
                console.log(`[REAL-TIME] User updated:`, user.email);
            }
            
            // Subscribe to real-time user data updates
            this.subscribeToUserUpdates(user.uid);
            
        } catch (error) {
            console.error('Firestore sync error:', error);
            throw error;
        }
    },

    // Subscribe to real-time user data updates
    subscribeToUserUpdates(uid) {
        const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
        
        return userRef.onSnapshot((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                console.log('[REAL-TIME] User data updated:', userData);
                
                // Update UI in real-time
                this.updateUIWithUserData(userData);
            }
        }, (error) => {
            console.error('[REAL-TIME] User subscription error:', error);
        });
    },

    // Update UI with real-time user data
    updateUIWithUserData(userData) {
        // Update avatar if exists
        if (userData.avatarUrl) {
            const avatarElements = document.querySelectorAll('.user-avatar');
            avatarElements.forEach(el => {
                el.src = userData.avatarUrl;
            });
        }
        
        // Update name
        if (userData.name) {
            const nameElements = document.querySelectorAll('.user-name');
            nameElements.forEach(el => {
                el.textContent = userData.name;
            });
        }
        
        // Update enrolled courses count
        if (userData.enrolledCourses) {
            const courseCountElements = document.querySelectorAll('.course-count');
            courseCountElements.forEach(el => {
                el.textContent = userData.enrolledCourses.length;
            });
        }
    },

    // Logout
    async logout() {
        try {
            await auth.signOut();
            showToast('Tizimdan chiqdingiz', 'info');
            
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Chiqishda xatolik', 'error');
        }
    },

    // Reset password
    async resetPassword(email) {
        try {
            showLoading();
            await auth.sendPasswordResetEmail(email);
            hideLoading();
            showToast('Parol tiklash havolasi yuborildi', 'success');
        } catch (error) {
            hideLoading();
            console.error('Reset password error:', error);
            showToast(this.getErrorMessage(error), 'error');
            throw error;
        }
    },

    // Get user data from Firestore
    async getUserData(uid) {
        try {
            const doc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
            if (doc.exists) {
                return { uid: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Get user data error:', error);
            return null;
        }
    },

    // Update UI for logged in user
    updateUIForLoggedInUser(user) {
        // Update navigation
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            navActions.innerHTML = `
                <button class="theme-toggle" id="themeToggle">
                    <i class="fas fa-moon"></i>
                </button>
                <a href="pages/dashboard.html" class="btn btn-outline">Dashboard</a>
                <button class="btn btn-primary" onclick="AuthService.logout()">Chiqish</button>
            `;
        }
    },

    // Update UI for logged out user
    updateUIForLoggedOutUser() {
        // Reset navigation
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            navActions.innerHTML = `
                <button class="theme-toggle" id="themeToggle">
                    <i class="fas fa-moon"></i>
                </button>
                <a href="pages/login.html" class="btn btn-outline">Kirish</a>
                <a href="pages/register.html" class="btn btn-primary">Ro'yxatdan o'tish</a>
            `;
        }
    },

    // Get error message in Uzbek
    getErrorMessage(error) {
        const errorMessages = {
            'auth/invalid-email': 'Noto\'g\'ri email manzili',
            'auth/user-disabled': 'Foydalanuvchi bloklangan',
            'auth/user-not-found': 'Foydalanuvchi topilmadi',
            'auth/wrong-password': 'Noto\'g\'ri parol',
            'auth/email-already-in-use': 'Bu email allaqachon ro\'yxatdan o\'tgan',
            'auth/weak-password': 'Parol juda oson (kamida 6 ta belgi)',
            'auth/invalid-credential': 'Noto\'g\'ri login yoki parol',
            'auth/popup-closed-by-user': 'Kirish oynasi yopildi',
            'auth/cancelled-popup-request': 'So\'rov bekor qilindi',
            'auth/operation-not-allowed': 'Bu orqali kirish vaqtincha o\'chirilgan. Iltimos, boshqa usuldan foydalaning',
            'auth/account-exists-with-different-credential': 'Bu email bilan boshqa usulda ro\'yxatdan o\'tilgan'
        };

        // Check if we have a user-friendly message for this error code
        if (errorMessages[error.code]) {
            return errorMessages[error.code];
        }

        // Log the actual error to console for debugging, but don't show to user
        console.error('Firebase auth error:', error.code, error.message);

        // Return generic user-friendly message for unknown errors
        return 'Kirishda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.';
    }
};

// Initialize auth on page load
document.addEventListener('DOMContentLoaded', () => {
    AuthService.init();
});

// Make available globally
window.AuthService = AuthService;
