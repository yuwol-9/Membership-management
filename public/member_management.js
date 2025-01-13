document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    try {
        console.log('API 객체 확인:', API);
        await loadMembers();
        setupEventListeners();
    } catch (error) {
        console.error('회원 데이터 로드 실패:', error);
        API.handleApiError(error);
    }
});

// 회원 데이터 로드
async function loadMembers() {
    try {
        console.log('loadMembers 함수 실행');
        const members = await API.getMembers();
        updateTable(members);
    } catch (error) {
        console.error('회원 목록 조회 실패:', error);
        throw error;
    }
}

function updateTable(members) {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';
    
    members.forEach(member => {
        const tr = document.createElement('tr');
        
        // 기본 정보 셀 생성
        const basicInfo = `
            <td style="${member.remaining_days == 0 ? 'color: red;' : member.remaining_days <= 3 ? 'color: #E56736;' : ''}">${member.name || '-'}</td>
            <td>${member.phone || '-'}</td>
            <td>${formatDate(member.birthdate) || '-'}</td>
            <td>${member.age || '-'}</td>
            <td>${formatGender(member.gender) || '-'}</td>
            <td>${member.address || '-'}</td>
        `;
        tr.innerHTML = basicInfo;
 
        // 프로그램 정보 셀 생성
        const programs = member.programs || [];
        const programCell = document.createElement('td');
        
        if (programs.length > 1) {
            const select = document.createElement('select');
            select.className = 'program-select';
            
            programs.forEach(program => {
                const option = document.createElement('option');
                option.value = program.id;
                option.textContent = program.name;
                select.appendChild(option);
            });
            
            select.addEventListener('change', (e) => {
                const selectedProgram = programs.find(p => p.id === parseInt(e.target.value));
                updateProgramDetails(tr, selectedProgram);
            });
            
            programCell.appendChild(select);
        } else if (programs.length === 1) {
            programCell.textContent = programs[0].name || '-';
        } else {
            programCell.textContent = '-';
        }
        tr.appendChild(programCell);
 
        // 초기 프로그램 상세 정보 표시
        const initialProgram = programs[0] || {};
        appendProgramDetails(tr, initialProgram);
 
        tbody.appendChild(tr);
    });
}

function appendProgramDetails(row, program) {
   const remaining = program.remaining_days;
   const remainingDisplay = remaining !== undefined && remaining !== null ? `${remaining}일` : '-';
   const remainingColor = remaining <= 0 ? 'red' : 
                         remaining <= 3 ? '#E56736' : '';
    // 구독 정보 셀
    const subscriptionCell = document.createElement('td');
    const subscriptionDisplay = formatSubscription(program);
    subscriptionCell.textContent = subscriptionDisplay;
    row.appendChild(subscriptionCell);
 
    // 총액 셀
    const amountCell = document.createElement('td');
    const totalAmount = calculateTotalAmount(program);
    amountCell.textContent = formatCurrency(totalAmount);
    row.appendChild(amountCell);
 
    // 남은 일수 셀
    const remainingCell = document.createElement('td');
    remainingCell.textContent = remainingDisplay;
    remainingCell.style.color = remainingColor;
    row.appendChild(remainingCell);
 
    // 결제 상태 셀
    const paymentCell = document.createElement('td');
    paymentCell.textContent = formatPaymentStatus(program.payment_status);
    row.appendChild(paymentCell);
 
    // 등록 날짜 셀
    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(program.start_date) || '-';
    row.appendChild(dateCell);
 
    // 수정 버튼 셀
    const actionCell = document.createElement('td');
    actionCell.innerHTML = `<button onclick="location.href='회원정보수정.html?id=${program.id}'" class="btn-primary">수정</button>`;
    row.appendChild(actionCell);
 }

function updateProgramDetails(row, program) {
    for (let i = 0; i < 6; i++) {
        row.deleteCell(-1);
    }
    appendProgramDetails(row, program);
 }
 
function formatSubscription(program) {
    if (!program) return '-';
    if (program.total_classes > 0) {
        return `${program.total_classes}회`;
    } else if (program.duration_months > 0) {
        return `${program.duration_months}개월`;
    }
    return '-';
 }

function calculateTotalAmount(program) {
    if (!program) return 0;
    if (program.total_classes > 0) {
        return program.total_amount || program.per_class_price * program.total_classes;
    } else if (program.duration_months > 0) {
        return program.total_amount || program.monthly_price * program.duration_months;
    }
    return 0;
 }

function formatGender(gender) {
    if (!gender) return '-';
    return gender === 'male' ? '남성' : '여성';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatCurrency(amount) {
    if (!amount) return '-';
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}

function formatPaymentStatus(status) {
    if (!status) return '-';
    return status === 'paid' ? '완납' : '미납';
}

function setupEventListeners() {
    setupSearchFunction();
    setupSortButtons();
    setupMemberRegistrationButton();
    setupMemberEditButton();
}

function setupSearchFunction() {
    const searchInput = document.querySelector('.search-bar input');
    const searchButton = document.querySelector('.search-bar .search-button'); // 검색 버튼
    const showAllButton = document.querySelector('.search-bar .show-all-button'); // 모두 보기 버튼

    if (searchInput && searchButton) {
        searchButton.addEventListener('click', () => {
            performSearch(searchInput.value);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
    }

    if (showAllButton) {
        showAllButton.addEventListener('click', async () => {
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.value = '';
        }
        await loadMembers();
        });
    }
}

function performSearch(searchTerm) {
    const rows = document.querySelectorAll('tbody tr');
    searchTerm = searchTerm.toLowerCase().trim();

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function setupSortButtons() {
    document.querySelectorAll('.button-group button').forEach(button => {
        button.addEventListener('click', async () => {
            const members = await API.getMembers();
            const type = button.textContent.trim();
            
            sortMembers(members, type);
            updateTable(members);
        });
    });
}

function sortMembers(members, type) {
    switch(type) {
        case '이름순':
            members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case '남은 횟수':
            members.sort((a, b) => (a.remaining_days || 0) - (b.remaining_days || 0));
            break;
        case '결제 상태':
            members.sort((a, b) => {
                const statusOrder = { 'paid': 0, 'unpaid': 1 };
                return statusOrder[a.payment_status] - statusOrder[b.payment_status];
            });
            break;
    }
}

function setupMemberRegistrationButton() {
    const registrationButton = document.querySelector('.member button:first-child');
    if (registrationButton) {
        registrationButton.addEventListener('click', () => {
            window.location.href = '회원정보등록.html';
        });
    }
}

function setupMemberEditButton() {
    const editButton = document.querySelector('.member button:last-child');
    if (editButton) {
        editButton.addEventListener('click', () => {
            window.location.href = '회원정보수정.html';
        });
    }
}

function showErrorMessage(message) {
    console.error(message);
    alert(message);
}
