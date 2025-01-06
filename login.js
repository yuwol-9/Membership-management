document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = loginForm.querySelector('input[name="username"]').value;
        const password = loginForm.querySelector('input[name="password"]').value;

        try {
            console.log('로그인 시도중...');
            const result = await API.login(username, password);
            console.log('로그인 성공');
            
            localStorage.setItem('isLoggedIn', 'true');
            
            setTimeout(() => {
                console.log('홈페이지로 이동 시도');
                window.location.href = '/홈페이지.html';
            }, 100);
            
        } catch (error) {
            console.error('로그인 실패:', error);
            alert('로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
        }
    });

    if (API.getToken() && localStorage.getItem('isLoggedIn')) {
        window.location.href = '/홈페이지.html';
    }
});