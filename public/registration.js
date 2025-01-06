document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('registrationForm');
    const durationButtons = document.querySelectorAll('.duration-btn');
    const statusButtons = document.querySelectorAll('.status-btn');
    let selectedDuration = null;
    let selectedStatus = null;

    const startDateInput = document.getElementById('start_date');
    const today = new Date().toISOString().split('T')[0];
    startDateInput.value = today;
    startDateInput.max = today;

    const birthdateInput = document.getElementById('birthdate');
    birthdateInput.max = today;

    // 구독 기간 버튼 이벤트 리스너
    durationButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            durationButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedDuration = parseInt(button.dataset.months);
        });
    });

    // 결제 상태 버튼 이벤트 리스너
    statusButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            statusButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedStatus = button.dataset.status;
        });
    });

    // 나이 계산 함수
    function calculateAge(birthdate) {
        const today = new Date();
        const birthDate = new Date(birthdate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    // 프로그램 선택 필드 추가
    try {
        const programFormGroup = document.createElement('div');
        programFormGroup.className = 'form-group';
        
        // 성별 선택 필드 찾기 및 프로그램 선택 필드 삽입 위치 결정
        const genderField = form.querySelector('[name="gender"]').parentNode;
        
        // API를 통해 프로그램 목록 가져오기
        const programs = await API.getPrograms();
        
        // 프로그램 선택 필드 HTML 생성
        programFormGroup.innerHTML = `
            <label for="program">프로그램 선택</label>
            <select id="program" name="program" required>
                <option value="">프로그램을 선택하세요</option>
                ${programs.map(prog => `<option value="${prog.id}">${prog.name}</option>`).join('')}
            </select>
        `;

        // 프로그램 선택 필드 삽입
        genderField.parentNode.insertBefore(programFormGroup, genderField.nextSibling);
        
    } catch (error) {
        console.error('프로그램 목록 로드 실패:', error);
    }

    // 폼 제출 처리
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            // 필수 입력값 확인
            if (!selectedDuration) {
                alert('구독 기간을 선택해주세요.');
                return;
            }

            if (!selectedStatus) {
                alert('결제 상태를 선택해주세요.');
                return;
            }

            const programSelect = form.querySelector('[name="program"]');
            if (!programSelect || !programSelect.value) {
                alert('프로그램을 선택해주세요.');
                return;
            }

            const age = calculateAge(form.birthdate.value);
            const startDate = form.start_date.value || new Date().toISOString().split('T')[0];

            const memberData = {
                name: form.name.value.trim(),
                gender: form.gender.value,
                birthdate: form.birthdate.value,
                age: age,
                address: form.address.value.trim(),
                phone: form.phone.value.trim(),
                duration_months: selectedDuration,
                payment_status: selectedStatus,
                program_id: parseInt(programSelect.value),
                start_date: startDate
            };

            // API를 통해 회원 등록
            await API.createMember(memberData);
            
            alert('회원이 성공적으로 등록되었습니다.');
            window.location.href = '회원관리.html';
            
        } catch (error) {
            console.error('회원 등록 실패:', error);
            alert('회원 등록에 실패했습니다. 다시 시도해주세요.');
        }
    });
});