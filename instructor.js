document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadInstructors();
    } catch (error) {
        console.error('선생님 데이터 로드 실패:', error);
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
                <a href="선생님정보수정.html?id=${instructor.id}"><button class="btn-primary">수정</button></a>
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

function setupEventListeners() {
    const searchInput = document.querySelector('.search-bar input');
    const showAllButton = document.querySelector('.show-all-btn');
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

    if (showAllButton) {
        showAllButton.addEventListener('click', async () => {
            searchInput.value = '';
            await loadInstructors();
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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadInstructors();
        setupEventListeners();
    } catch (error) {
        console.error('선생님 데이터 로드 실패:', error);
        API.handleApiError(error);
    }
});