document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    try {
        console.log('API 객체 확인:', API);
        await loadMembers();
        setupEventListeners();

        const modalOverlay = document.querySelector('.modal-overlay');
        const memberInfoModal = document.querySelector('.member-info-modal');
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', closeModal);
        }
        
        if (memberInfoModal) {
            memberInfoModal.addEventListener('click', (e) => e.stopPropagation());
        }
    } catch (error) {
        console.error('회원 데이터 로드 실패:', error);
        API.handleApiError(error);
    }
});

// 회원 데이터 가져오기
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
        
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') {
                return;
            }
            showMemberInfo(member);
        });

        if (tooltipText) {
            tr.style.position = 'relative';
            setupTooltip(tr, tooltipText);
        }

        const nameCell = document.createElement('td');
        nameCell.style.color = nameColor;
        nameCell.textContent = member.name || '-';
        tr.appendChild(nameCell);

        const phoneCell = document.createElement('td');
        phoneCell.textContent = member.phone || '-';
        tr.appendChild(phoneCell);
        
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
                e.stopPropagation();
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
    
    const subscriptionCell = document.createElement('td');
    subscriptionCell.textContent = formatSubscription(program);
    row.appendChild(subscriptionCell);
 
    const amountCell = document.createElement('td');
    const displayAmount = program.original_amount || calculateAmount(program);
    amountCell.textContent = formatCurrency(displayAmount);
    row.appendChild(amountCell);
    
    const remainingCell = document.createElement('td');
    remainingCell.textContent = remainingDisplay;
    remainingCell.style.color = remainingColor;
    row.appendChild(remainingCell);
 
    const paymentCell = document.createElement('td');
    paymentCell.textContent = formatPaymentStatus(program.payment_status);
    row.appendChild(paymentCell);
 
    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(program.start_date) || '-';
    row.appendChild(dateCell);
 
    const editCell = document.createElement('td');
    const editButton = document.createElement('button');
    editButton.className = 'btn-primary';
    editButton.textContent = '수정 / 연장';
    editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        location.href = `회원수업수정.html?id=${program.id}`;
    });
    editCell.appendChild(editButton);
    row.appendChild(editCell);

    const addCell = document.createElement('td');
    const addButton = document.createElement('button');
    addButton.className = 'btn-primary';
    addButton.textContent = '추가';
    addButton.addEventListener('click', (e) => {
        e.stopPropagation();
        location.href = `회원수업추가.html?id=${program.id}`;
    });
    addCell.appendChild(addButton);
    row.appendChild(addCell);
}

 function updateProgramDetails(row, selectedProgram) {
    const existingCells = row.cells;
    const startIndex = 2;
    
    const programCell = existingCells[startIndex];
    const programSelect = programCell.querySelector('select');
    if (programSelect) {
        programSelect.value = selectedProgram.id;
    }
    
    if (existingCells[startIndex + 1]) {
        existingCells[startIndex + 1].textContent = formatSubscription(selectedProgram);
    }

    if (existingCells[startIndex + 2]) {
        existingCells[startIndex + 2].textContent = formatCurrency(selectedProgram.original_amount || calculateAmount(selectedProgram));
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

    // 회원 등록일 셀 업데이트
    if (existingCells[startIndex + 5]) {
        existingCells[startIndex + 5].textContent = formatDate(selectedProgram.start_date) || '-';
    }

    // 수정/연장 버튼 셀 업데이트
    if (existingCells[startIndex + 6]) {
        const modifyButton = existingCells[startIndex + 6].querySelector('button');
        if (modifyButton) {
            modifyButton.onclick = () => location.href = `회원수업수정.html?id=${selectedProgram.id}`;
        }
    }

    // 추가 버튼 셀 업데이트
    if (existingCells[startIndex + 7]) {
        const addButton = existingCells[startIndex + 7].querySelector('button');
        if (addButton) {
            addButton.onclick = () => location.href = `회원수업추가.html?id=${selectedProgram.id}`;
        }
    }
}

let currentMemberId = null;
function showMemberInfo(member) {
    currentMemberId = member.id;
    
    const nameInput = document.getElementById('modal-name');
    const phoneInput = document.getElementById('modal-phone');
    const birthdateInput = document.getElementById('modal-birthdate');
    const ageInput = document.getElementById('modal-age');
    const genderInput = document.getElementById('modal-gender');
    const addressInput = document.getElementById('modal-address');
    
    nameInput.value = member.name || '';
    phoneInput.value = member.phone || '';
    birthdateInput.value = member.birthdate ? member.birthdate.split('T')[0] : '';
    ageInput.value = member.age || '';
    genderInput.value = member.gender || '';
    addressInput.value = member.address || '';
    
    document.querySelector('.modal-overlay').style.display = 'block';
    document.querySelector('.member-info-modal').style.display = 'block';
}

async function handleModalEdit() {
    try {
        const memberData = {
            name: document.getElementById('modal-name').value,
            phone: document.getElementById('modal-phone').value,
            birthdate: document.getElementById('modal-birthdate').value,
            age: document.getElementById('modal-age').value,
            gender: document.getElementById('modal-gender').value,
            address: document.getElementById('modal-address').value
        };
        if (!memberData.name) {
            alert('이름을 입력해주세요.');
            return;
        }
        if (!memberData.phone) {
            alert('전화번호를 입력해주세요.');
            return;
        }
        if (!memberData.birthdate) {
            alert('생일을 입력해주세요.');
            return;
        }
        if (!memberData.age) {
            alert('나이을 입력해주세요.');
            return;
        }
        if (!memberData.gender) {
            alert('성별을 골라주세요.');
            return;
        }
        if (!memberData.address) {
            alert('주소를 입력해주세요.');
            return;
        }

        const programs = document.querySelector('.program-select');
        const selectedEnrollmentId = programs ? programs.value : null;
        const selectedProgram = programs ? 
            Array.from(programs.options).find(option => option.value === programs.value) : null;

        if (!selectedEnrollmentId || !selectedProgram) {
            throw new Error('수업 정보를 찾을 수 없습니다.');
        }

        const member = await API.getMember(selectedEnrollmentId);
        if (!member) {
            throw new Error('회원의 수업 정보를 찾을 수 없습니다.');
        }

        const updateData = {
            ...memberData,
            program_id: member.program_id || null,
            payment_status: member.payment_status || 'unpaid',
            start_date: member.start_date || new Date().toISOString().split('T')[0],
            duration_months: member.duration_months || null,
            total_classes: member.total_classes || null
        };

        await API.updateMember(selectedEnrollmentId, updateData);
        alert('회원 정보가 성공적으로 수정되었습니다.');
        closeModal();
        await loadMembers();
    } catch (error) {
        console.error('회원 정보 수정 실패:', error);
        alert(error.message || '회원 정보 수정에 실패했습니다.');
    }
}

async function handleModalDelete() {
    if (confirm('정말로 이 회원을 삭제하시겠습니까?')) {
        try {
            const member = await API.getMember(currentMemberId);
            if (!member) {
                throw new Error('회원 정보를 찾을 수 없습니다.');
            }

            if (member.programs && member.programs.length > 0) {
                const enrollmentId = member.programs[0].id;
                await API.deleteMember(enrollmentId);
                alert('회원이 성공적으로 삭제되었습니다.');
                closeModal();
                await loadMembers();
            } else {
                throw new Error('회원의 수업 정보를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('회원 삭제 실패:', error);
            alert(error.message || '회원 삭제에 실패했습니다.');
        }
    }
}

function closeModal() {
    document.querySelector('.modal-overlay').style.display = 'none';
    document.querySelector('.member-info-modal').style.display = 'none';
    currentMemberId = null;
}

document.getElementById('modal-birthdate').addEventListener('change', function() {
    const birthdate = new Date(this.value);
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDiff = today.getMonth() - birthdate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
    }
    
    document.getElementById('modal-age').value = age;
});

function setupTooltip(element, text) {
    element.addEventListener('mouseover', (e) => {
        const existingTooltip = document.querySelector('.tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.fontSize = '14px';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.zIndex = '1000';
        
        const rect = element.getBoundingClientRect();
        tooltip.style.top = (e.clientY - rect.top + 20) + 'px';
        tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
        
        element.appendChild(tooltip);
    });

    element.addEventListener('mousemove', (e) => {
        const tooltip = element.querySelector('.tooltip');
        if (tooltip) {
            const rect = element.getBoundingClientRect();
            tooltip.style.top = (e.clientY - rect.top + 20) + 'px';
            tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
        }
    });

    element.addEventListener('mouseout', () => {
        const tooltip = element.querySelector('.tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    });
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

 function calculateAmount(program) {
    if (!program) return 0;
    if (program.original_amount !== undefined) {
        return program.original_amount;
    }
    if (program.total_classes > 0) {
        return program.per_class_price * program.total_classes;
    } else if (program.duration_months > 0) {
        return program.monthly_price * program.duration_months;
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
            window.location.href = '회원수업수정.html';
        });
    }
}

function showErrorMessage(message) {
    console.error(message);
    alert(message);
}