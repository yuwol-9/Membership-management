document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('registrationForm');
    const durationButtons = document.querySelectorAll('.duration-btn');
    let selectedDuration = null;

    durationButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            durationButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedDuration = parseInt(button.dataset.months);
        });
    });

    try {
        const programs = await API.getPrograms();
        
        const programSelect = document.createElement('select');
        programSelect.id = 'program';
        programSelect.name = 'program';
        programSelect.required = true;

        programSelect.innerHTML = `
            <option value="">프로그램을 선택하세요.</option>
            ${programs.map(prog => 
                `<option value="${prog.id}">${prog.name}</option>`
            ).join('')}
        `;

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        formGroup.innerHTML = `
            <label for="program">프로그램 선택</label>
        `;
        formGroup.appendChild(programSelect);

        const genderField = form.querySelector('[name="gender"]').parentNode;
        genderField.parentNode.insertBefore(formGroup, genderField.nextSibling);
    } catch (error) {
        console.error('프로그램 목록 로드 실패:', error);
        alert('프로그램 목록을 불러오는데 실패했습니다.');
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
    
        if (!selectedDuration) {
            alert('구독 기간을 선택해주세요.');
            return;
        }

        if (!form.program.value) {
            alert('프로그램을 선택해주세요.');
            return;
        }
    
        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요합니다.');
            window.location.href = '로그인.html';
            return;
        }
    
        const memberData = {
            name: form.name.value.trim(),
            gender: form.gender.value,
            age: parseInt(form.age.value),
            address: form.address.value.trim(),
            phone: form.phone.value.trim(),
            duration_months: selectedDuration,
            payment_status: 'unpaid',
            program_id: parseInt(form.program.value)
        };
    
        try {
            const response = await fetch('http://localhost:8080/api/members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(memberData)
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const result = await response.json();
            alert('회원이 성공적으로 등록되었습니다.');
            window.location.href = '회원관리.html';
        } catch (error) {
            console.error('회원 등록 실패:', error);
            alert('회원 등록에 실패했습니다. 다시 시도해주세요.');
        }
    });
});