// ============================================
// QUIZ SERVICE - ADMIN & REAL-TIME SYNC
// ============================================

const QuizService = {
    // Cache for quizzes
    quizzesCache: [],
    _unsubscribers: [],

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    // Create quiz for a lesson
    async createQuiz(lessonId, courseId, quizData) {
        try {
            showLoading();
            
            const quizRef = db.collection(COLLECTIONS.QUIZZES).doc();
            const quiz = {
                id: quizRef.id,
                lessonId: lessonId,
                courseId: courseId,
                title: quizData.title,
                description: quizData.description,
                questions: quizData.questions.map((q, index) => ({
                    id: `q${index + 1}`,
                    text: q.text,
                    options: q.options,
                    correctOptionIndex: q.correctOptionIndex,
                    explanation: q.explanation || ''
                })),
                timeLimit: quizData.timeLimit || 0, // minutes, 0 = no limit
                passingScore: quizData.passingScore || 70, // percentage
                maxAttempts: quizData.maxAttempts || 3,
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser.uid
            };

            await quizRef.set(quiz);
            
            // Update lesson to mark hasQuiz = true
            await db.collection(COLLECTIONS.COURSES)
                .doc(courseId)
                .collection('lessons')
                .doc(lessonId)
                .update({
                    hasQuiz: true,
                    quizId: quizRef.id,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            hideLoading();
            showToast('Test muvaffaqiyatli yaratildi!', 'success');
            
            // Real-time notification will be sent to mobile apps automatically
            console.log('[REAL-TIME] Quiz created and synced to mobile:', quiz.id);
            
            return quiz;
        } catch (error) {
            hideLoading();
            console.error('Create quiz error:', error);
            showToast('Test yaratishda xatolik: ' + error.message, 'error');
            throw error;
        }
    },

    // Update quiz
    async updateQuiz(quizId, quizData) {
        try {
            showLoading();
            
            const quizRef = db.collection(COLLECTIONS.QUIZZES).doc(quizId);
            
            await quizRef.update({
                title: quizData.title,
                description: quizData.description,
                questions: quizData.questions.map((q, index) => ({
                    id: q.id || `q${index + 1}`,
                    text: q.text,
                    options: q.options,
                    correctOptionIndex: q.correctOptionIndex,
                    explanation: q.explanation || ''
                })),
                timeLimit: quizData.timeLimit || 0,
                passingScore: quizData.passingScore || 70,
                maxAttempts: quizData.maxAttempts || 3,
                isActive: quizData.isActive ?? true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            hideLoading();
            showToast('Test yangilandi!', 'success');
            
            console.log('[REAL-TIME] Quiz updated and synced:', quizId);
            
            return true;
        } catch (error) {
            hideLoading();
            console.error('Update quiz error:', error);
            showToast('Test yangilashda xatolik: ' + error.message, 'error');
            throw error;
        }
    },

    // Delete quiz
    async deleteQuiz(quizId, lessonId, courseId) {
        try {
            if (!confirm('Haqiqatan ham bu testni o\'chirmoqchimisiz?')) {
                return false;
            }
            
            showLoading();
            
            // Delete quiz
            await db.collection(COLLECTIONS.QUIZZES).doc(quizId).delete();
            
            // Update lesson to remove quiz reference
            await db.collection(COLLECTIONS.COURSES)
                .doc(courseId)
                .collection('lessons')
                .doc(lessonId)
                .update({
                    hasQuiz: false,
                    quizId: null,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            hideLoading();
            showToast('Test o\'chirildi!', 'success');
            
            console.log('[REAL-TIME] Quiz deleted, mobile apps notified:', quizId);
            
            return true;
        } catch (error) {
            hideLoading();
            console.error('Delete quiz error:', error);
            showToast('Test o\'chirishda xatolik: ' + error.message, 'error');
            throw error;
        }
    },

    // Get all quizzes
    async getQuizzes() {
        try {
            const snapshot = await db.collection(COLLECTIONS.QUIZZES)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Get quizzes error:', error);
            throw error;
        }
    },

    // Get quiz by lesson
    async getQuizByLesson(lessonId) {
        try {
            const snapshot = await db.collection(COLLECTIONS.QUIZZES)
                .where('lessonId', '==', lessonId)
                .where('isActive', '==', true)
                .limit(1)
                .get();

            if (snapshot.empty) return null;
            
            const doc = snapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error('Get quiz by lesson error:', error);
            throw error;
        }
    },

    // Get quiz results
    async getQuizResults(quizId) {
        try {
            const snapshot = await db.collection(COLLECTIONS.QUIZ_RESULTS)
                .where('quizId', '==', quizId)
                .orderBy('completedAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Get quiz results error:', error);
            throw error;
        }
    },

    // ============================================
    // REAL-TIME SUBSCRIPTIONS (for mobile sync)
    // ============================================

    // Subscribe to quiz updates for a lesson
    subscribeToQuiz(lessonId, callback) {
        console.log(`[REAL-TIME] Subscribing to quiz for lesson: ${lessonId}`);
        
        const unsubscribe = db.collection(COLLECTIONS.QUIZZES)
            .where('lessonId', '==', lessonId)
            .where('isActive', '==', true)
            .onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    console.log('[REAL-TIME] No quiz for this lesson');
                    if (callback) callback(null);
                    return;
                }

                const doc = snapshot.docs[0];
                const quiz = {
                    id: doc.id,
                    ...doc.data()
                };
                
                console.log(`[REAL-TIME] Quiz updated for lesson ${lessonId}:`, quiz.title);
                
                // Handle changes
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        showToast('Yangi test qo\'shildi!', 'success');
                    } else if (change.type === 'modified') {
                        showToast('Test yangilandi!', 'info');
                    } else if (change.type === 'removed') {
                        showToast('Test o\'chirildi!', 'warning');
                    }
                });

                if (callback) callback(quiz);
            }, (error) => {
                console.error('[REAL-TIME] Quiz subscription error:', error);
            });

        this._unsubscribers.push(unsubscribe);
        return unsubscribe;
    },

    // Subscribe to all quizzes (for admin dashboard)
    subscribeToAllQuizzes(callback) {
        console.log('[REAL-TIME] Subscribing to all quizzes');
        
        const unsubscribe = db.collection(COLLECTIONS.QUIZZES)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                const quizzes = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                this.quizzesCache = quizzes;
                console.log(`[REAL-TIME] Received ${quizzes.length} quizzes`);
                
                if (callback) callback(quizzes);
            }, (error) => {
                console.error('[REAL-TIME] All quizzes subscription error:', error);
            });

        this._unsubscribers.push(unsubscribe);
        return unsubscribe;
    },

    // Unsubscribe all
    unsubscribeAll() {
        console.log('[REAL-TIME] Unsubscribing from all quiz updates...');
        this._unsubscribers.forEach(unsub => unsub());
        this._unsubscribers = [];
    },

    // ============================================
    // QUIZ RESULTS (for statistics)
    // ============================================

    // Get quiz statistics
    async getQuizStatistics(quizId) {
        try {
            const resultsSnapshot = await db.collection(COLLECTIONS.QUIZ_RESULTS)
                .where('quizId', '==', quizId)
                .get();

            const results = resultsSnapshot.docs.map(doc => doc.data());
            
            if (results.length === 0) {
                return {
                    totalAttempts: 0,
                    uniqueUsers: 0,
                    averageScore: 0,
                    passRate: 0,
                    highestScore: 0,
                    lowestScore: 0
                };
            }

            const scores = results.map(r => r.score);
            const uniqueUsers = new Set(results.map(r => r.userId)).size;
            const passed = results.filter(r => r.passed).length;

            return {
                totalAttempts: results.length,
                uniqueUsers: uniqueUsers,
                averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
                passRate: (passed / results.length) * 100,
                highestScore: Math.max(...scores),
                lowestScore: Math.min(...scores)
            };
        } catch (error) {
            console.error('Get quiz statistics error:', error);
            throw error;
        }
    }
};

// Make available globally
window.QuizService = QuizService;
