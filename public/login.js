document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = loginForm.querySelector('input[name="username"]').value.toLowerCase();
        const password = loginForm.querySelector('input[name="password"]').value;

        try {
            const response = await fetch('http://localhost:8080/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '로그인에 실패했습니다.');
            }

            const data = await response.json();
            localStorage.setItem('token', data.token);
            window.location.href = '홈페이지.html';
        } catch (error) {
            console.error('Login error:', error);
            alert('로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
        }
    });
});