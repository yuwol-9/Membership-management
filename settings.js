document.addEventListener('DOMContentLoaded', () => {
    const usernameForm = document.getElementById('username-form');
    const passwordForm = document.getElementById('password-form');
    const usernameError = document.getElementById('username-error');
    const passwordError = document.getElementById('password-error');

    usernameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        usernameError.style.display = 'none';
        
        const currentPassword = document.getElementById('current-password-username').value;
        const newUsername = document.getElementById('new-username').value;

        try {
            // 현재 비밀번호 확인
            await API.verifyPassword(currentPassword);

            // 아이디 변경
            await API.changeUsername(currentPassword, newUsername);
            
            alert('아이디가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
            API.logout();
        } catch (error) {
            usernameError.textContent = error.message;
            usernameError.style.display = 'block';
        }
    });

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        passwordError.style.display = 'none';

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        try {
            if (newPassword !== confirmPassword) {
                throw new Error('새 비밀번호가 일치하지 않습니다.');
            }

            if (newPassword.length < 8) {
                throw new Error('비밀번호는 최소 8자 이상이어야 합니다.');
            }

            // 현재 비밀번호 확인
            await API.verifyPassword(currentPassword);

            // 비밀번호 변경
            await API.changePassword(currentPassword, newPassword);
            
            alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
            API.logout();
        } catch (error) {
            passwordError.textContent = error.message;
            passwordError.style.display = 'block';
        }
    });
});