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
        const totalPrice = member.price * (member.duration_months || 1);
        tr.innerHTML = `
            <td>${member.name || '-'}</td>
            <td>${member.phone || '-'}</td>
            <td>${formatDate(member.birthdate) || '-'}</td>
            <td>${member.age || '-'}</td>
            <td>${formatGender(member.gender) || '-'}</td>
            <td>${member.address || '-'}</td>
            <td>${member.program_name || '-'}</td>
            <td>${member.duration_months ? `${member.duration_months}개월` : '-'}</td>
            <td>${totalPrice ? formatCurrency(totalPrice) : '-'}</td>
            <td>${member.remaining_days !== undefined ? `${member.remaining_days}일` : '-'}</td>
            <td>${formatPaymentStatus(member.payment_status) || '-'}</td>
            <td>${formatDate(member.start_date) || '-'}</td>
            <td>
                <button onclick="location.href='회원정보수정.html?id=${member.id}'" class="btn-primary">수정</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
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
    const searchButton = document.querySelector('.search-bar button');

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
        case '정렬':
            members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case '남은 횟수':
            members.sort((a, b) => (b.remaining_days || 0) - (a.remaining_days || 0));
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