document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadInstructors();
    } catch (error) {
        console.error('강사 데이터 로드 실패:', error);
        API.handleApiError(error);
    }
});

async function loadInstructors() {
    try {
        const instructors = await API.getInstructors();
        updateTable(instructors);
    } catch (error) {
        throw error;
    }
}

function updateTable(instructors) {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';
    
    instructors.forEach(instructor => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${instructor.name || '-'}</td>
            <td>${instructor.phone || '-'}</td>
            <td>${formatCurrency(instructor.salary) || '-'}</td>
            <td>
                <a href="강사정보수정.html?id=${instructor.id}"><button class="btn-primary">수정</button></a>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function formatCurrency(amount) {
    if (!amount) return '-';
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}