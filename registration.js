document.addEventListener('DOMContentLoaded', async () => {
    initializeDateFields();
    await loadPrograms();
    setupEventListeners();
});

function initializeDateFields() {
    const birthdateInput = document.getElementById('birthdate');
    const startDateInput = document.getElementById('start_date');
    const today = new Date();
    
    // 생년월일은 오늘 이전만 선택 가능
    birthdateInput.max = today.toISOString().split('T')[0];
    
    // 시작일은 오늘부터 한 달 후까지만 선택 가능
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(today.getMonth() + 1);
    
    startDateInput.min = today.toISOString().split('T')[0];
    startDateInput.max = oneMonthLater.toISOString().split('T')[0];
    startDateInput.value = today.toISOString().split('T')[0];
}

async function loadPrograms() {
    try {
        const programs = await API.getPrograms();
        const programSelect = document.getElementById('program');
        programSelect.innerHTML = '<option value="">선택하세요</option>';
        
        programs.forEach(prog => {
            const option = document.createElement('option');
            option.value = prog.id;
            option.textContent = prog.name;
            programSelect.appendChild(option);
        });
    } catch (error) {
        console.error('프로그램 목록 로드 실패:', error);
        API.handleApiError(error);
    }
}

// 가격 정보를 저장할 객체
const prices = {
    monthly: {},
    perClass: {}
};

function updateProgramSelection() {
    calculateAmount();
}

function setSubscription(value) {
    const inputField = document.getElementById('custom-subscription');
    inputField.style.display = 'block';
    inputField.value = value;
    calculateAmount();
}

function enableCustomInput() {
    const inputField = document.getElementById('custom-subscription');
    inputField.style.display = 'block';
    inputField.value = '';
    document.getElementById('amount-display').innerText = '결제 금액: 0원';
}

function calculateAmount() {
    const programSelect = document.getElementById('program');
    const subscriptionInput = document.getElementById('custom-subscription');
    const amountDisplay = document.getElementById('amount-display');
    
    if (!programSelect.value || !subscriptionInput.value) {
        amountDisplay.innerText = '결제 금액: 0원';
        return;
    }

    const programId = programSelect.value;
    const subscriptionValue = subscriptionInput.value;
    
    // "개월" 또는 "회" 단위 구분
    const monthMatch = subscriptionValue.match(/^(\d+)개월$/);
    const classMatch = subscriptionValue.match(/^(\d+)회$/);
    
    let totalAmount = 0;
    
    if (monthMatch) {
        const months = parseInt(monthMatch[1]);
        totalAmount = months * (prices.monthly[programId] || 0);
    } else if (classMatch) {
        const classes = parseInt(classMatch[1]);
        totalAmount = classes * (prices.perClass[programId] || 0);
    }

    amountDisplay.innerText = `결제 금액: ${totalAmount.toLocaleString()}원`;
}

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

async function registerMember() {
    try {
        const formData = {
            name: document.getElementById('name').value,
            gender: document.getElementById('gender').value,
            birthdate: document.getElementById('birthdate').value,
            age: document.getElementById('age').value,
            address: document.getElementById('address').value,
            phone: document.getElementById('phone').value,
            program_id: document.getElementById('program').value,
            start_date: document.getElementById('start_date').value
        };

        const subscription = document.getElementById('custom-subscription').value;
        const monthMatch = subscription.match(/^(\d+)개월$/);
        
        if (monthMatch) {
            formData.duration_months = parseInt(monthMatch[1]);
        } else {
            const classMatch = subscription.match(/^(\d+)회$/);
            if (classMatch) {
                formData.duration_months = 1; // 회차 결제의 경우 1개월로 설정
                formData.total_classes = parseInt(classMatch[1]);
            }
        }

        // 결제 상태는 기본값으로 미납으로 설정
        formData.payment_status = 'unpaid';

        const response = await API.createMember(formData);
        alert('회원이 성공적으로 등록되었습니다.');
        window.location.href = '회원관리.html';
    } catch (error) {
        console.error('회원 등록 실패:', error);
        alert('회원 등록에 실패했습니다. 다시 시도해주세요.');
    }
}

function setupEventListeners() {
    const birthdateInput = document.getElementById('birthdate');
    if (birthdateInput) {
        birthdateInput.addEventListener('change', function() {
            const age = calculateAge(this.value);
            document.getElementById('age').value = age;
        });
    }

    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            registerMember();
        });
    }
}