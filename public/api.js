const API = {
    API_BASE_URL: 'http://localhost:8080/api',

    // Token management
    getToken: () => localStorage.getItem('token'),
    setToken: (token) => localStorage.setItem('token', token),
    removeToken: () => localStorage.removeItem('token'),

    // API calls with authentication
    apiCall: async (endpoint, options = {}) => {
        const token = API.getToken();
        if (!token && !endpoint.includes('login')) {
            window.location.href = '/로그인.html';
            throw new Error('로그인이 필요합니다.');
        }

        try {
            const response = await fetch(`${API.API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` }),
                    ...options.headers
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    API.removeToken();
                    window.location.href = '/로그인.html';
                    throw new Error('인증이 만료되었습니다.');
                }
                throw new Error(`API 요청 실패: ${response.status}`);
            }

            return response.json();
        } catch (error) {
            console.error('API 호출 에러:', error);
            throw error;
        }
    },

    // Auth APIs
    login: async (username, password) => {
        try {
            const response = await fetch(`${API.API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('로그인에 실패했습니다');
            }

            const data = await response.json();
            API.setToken(data.token);
            return data;
        } catch (error) {
            console.error('로그인 실패:', error);
            throw error;
        }
    },

    // Member APIs
    getMembers: async () => {
        try {
            const response = await API.apiCall('/members');
            return response;
        } catch (error) {
            console.error('회원 목록 조회 실패:', error);
            throw error;
        }
    },

    createMember: async (memberData) => {
        return API.apiCall('/members', {
            method: 'POST',
            body: JSON.stringify(memberData)
        });
    },

    updateMember: async (id, memberData) => {
        return API.apiCall(`/members/${id}`, {
            method: 'PUT',
            body: JSON.stringify(memberData)
        });
    },

    deleteMember: async (id) => {
        return API.apiCall(`/members/${id}`, {
            method: 'DELETE'
        });
    },

    // Attendance APIs
    checkAttendance: async (enrollmentData) => {
        return API.apiCall('/attendance', {
            method: 'POST',
            body: JSON.stringify({
                enrollment_id: enrollmentData.enrollment_id,
                attendance_date: enrollmentData.attendance_date,
                is_present: enrollmentData.is_present
            })
        });
    },

    getAttendanceList: async (filters = {}) => {
        const queryString = new URLSearchParams(filters).toString();
        return API.apiCall(`/attendance?${queryString}`);
    },

    // Dashboard APIs
    getDashboardStats: async () => {
        return API.apiCall('/dashboard');
    },

    // Statistics APIs
    getMonthlyStats: async () => {
        return API.apiCall('/statistics/monthly');
    },

    getProgramStats: async () => {
        return API.apiCall('/statistics/program');
    },

    // Programs APIs
    getPrograms: async () => {
        return API.apiCall('/programs');
    },

    // Error Handler
    handleApiError: (error) => {
        console.error('API 에러:', error);
        
        if (error.message.includes('인증')) {
            API.removeToken();
            window.location.href = '/로그인.html';
        }
        
        alert(error.message || '서버 오류가 발생했습니다.');
    },

    // Utility Functions
    checkAuthStatus: () => {
        const token = API.getToken();
        if (!token) {
            window.location.href = '/로그인.html';
            return false;
        }
        return true;
    },

    logout: () => {
        API.removeToken();
        window.location.href = '/로그인.html';
    }
};

// Add event listener for global error handling
window.addEventListener('unhandledrejection', (event) => {
    API.handleApiError(event.reason);
});

// Make API globally available
window.API = API;