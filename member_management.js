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
        
        const programs = member.programs || [];
        const sortedPrograms = [...programs].sort((a, b) => 
            (a.remaining_days || 0) - (b.remaining_days || 0)
        );

        let nameColor = '';
        let tooltipText = '';

        const zeroDaysProgram = sortedPrograms.find(p => p.remaining_days === 0);
        const lowestDaysProgram = sortedPrograms.find(p => p.remaining_days > 0 && p.remaining_days <= 3);
        
        if (zeroDaysProgram) {
            nameColor = 'red';
            tooltipText = `${zeroDaysProgram.name} 수업의 결제일입니다.`;
        } else if (lowestDaysProgram) {
            nameColor = '#E56736';
            tooltipText = `${lowestDaysProgram.name} 수업의 남은 일수가 ${lowestDaysProgram.remaining_days}회입니다.`;
        }
        
        if (tooltipText) {
            tr.style.position = 'relative';
            tr.style.cursor = 'pointer';

            tr.addEventListener('mouseover', (e) => {
                // Remove any existing tooltips
                const existingTooltip = document.querySelector('.tooltip');
                if (existingTooltip) {
                    existingTooltip.remove();
                }

                const tooltip = document.createElement('div');
                tooltip.className = 'tooltip';
                tooltip.textContent = tooltipText;
                tooltip.style.position = 'absolute';
                tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                tooltip.style.color = 'white';
                tooltip.style.padding = '8px 12px';
                tooltip.style.borderRadius = '4px';
                tooltip.style.fontSize = '14px';
                tooltip.style.whiteSpace = 'nowrap';
                tooltip.style.zIndex = '1000';
                
                // Position the tooltip near the cursor
                const rect = tr.getBoundingClientRect();
                const scrollTop = window.scrollY;
                tooltip.style.top = (e.clientY - rect.top + 20) + 'px';
                tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
                
                tr.appendChild(tooltip);
            });
            
            tr.addEventListener('mousemove', (e) => {
                const tooltip = tr.querySelector('.tooltip');
                if (tooltip) {
                    const rect = tr.getBoundingClientRect();
                    tooltip.style.top = (e.clientY - rect.top + 20) + 'px';
                    tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
                }
            });

            tr.addEventListener('mouseout', () => {
                const tooltip = tr.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.remove();
                }
            });
        }

        const nameCell = document.createElement('td');
        nameCell.style.color = nameColor;
        nameCell.textContent = member.name || '-';
        tr.appendChild(nameCell);
        
        tr.innerHTML += `
            <td>${member.phone || '-'}</td>
            <td>${formatDate(member.birthdate) || '-'}</td>
            <td>${member.age || '-'}</td>
            <td>${formatGender(member.gender) || '-'}</td>
            <td>${member.address || '-'}</td>
        `;
        
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
    actionCell.innerHTML = `<button onclick="location.href='회원정보수정.html?id=${program.id}'" class="btn-primary">수정/연장</button>`;
    row.appendChild(actionCell);

    // 수업 추가 버튼 셀
    const addClassCell = document.createElement('td');
    addClassCell.innerHTML = `<button onclick="location.href='회원수업추가.html?id=${program.id}'" class="btn-primary">추가</button>`;
    row.appendChild(addClassCell);
 }

 function updateProgramDetails(row, selectedProgram) {
    const existingCells = row.cells;
    const startIndex = 6;
    
    const programCell = existingCells[startIndex];
    const programSelect = programCell.querySelector('select');
    if (programSelect) {
        programSelect.value = selectedProgram.id;
    }
    
    if (existingCells[startIndex + 1]) {
        existingCells[startIndex + 1].textContent = formatSubscription(selectedProgram);
    }

    if (existingCells[startIndex + 2]) {
        existingCells[startIndex + 2].textContent = formatCurrency(calculateTotalAmount(selectedProgram));
    }

    // 남은 일수 셀 업데이트
    if (existingCells[startIndex + 3]) {
        const remainingCell = existingCells[startIndex + 3];
        const remaining = selectedProgram.remaining_days;
        remainingCell.textContent = remaining !== undefined && remaining !== null ? `${remaining}일` : '-';
        remainingCell.style.color = remaining <= 0 ? 'red' : 
                                  remaining <= 3 ? '#E56736' : '';
    }

    // 결제 상태 셀 업데이트
    if (existingCells[startIndex + 4]) {
        existingCells[startIndex + 4].textContent = formatPaymentStatus(selectedProgram.payment_status);
    }

    // 등록 날짜 셀 업데이트
    if (existingCells[startIndex + 5]) {
        existingCells[startIndex + 5].textContent = formatDate(selectedProgram.start_date) || '-';
    }
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
    const showAllButton = document.querySelector('.search-bar .show-all-button');
    const searchButton = document.querySelector('.search-bar .search-button');

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
            members.sort((a, b) => {
                const aPrograms = a.programs || [];
                const bPrograms = b.programs || [];
                const aMinDays = aPrograms.length > 0 ? 
                    Math.min(...aPrograms.map(p => p.remaining_days || 0)) : 0;
                const bMinDays = bPrograms.length > 0 ? 
                    Math.min(...bPrograms.map(p => p.remaining_days || 0)) : 0;
                return aMinDays - bMinDays;
            });
            break;
        case '결제 상태':
            members.sort((a, b) => {
                const statusOrder = { 'paid': 1, 'unpaid': 0 };
                const aPrograms = a.programs || [];
                const bPrograms = b.programs || [];
                const aHasUnpaid = aPrograms.some(p => p.payment_status === 'unpaid');
                const bHasUnpaid = bPrograms.some(p => p.payment_status === 'unpaid');
                return (aHasUnpaid ? 0 : 1) - (bHasUnpaid ? 0 : 1);
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