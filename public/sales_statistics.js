document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadInitialData();
        setupEventListeners();
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        API.handleApiError(error);
    }
});

async function loadInitialData() {
    try {
        const monthlyStats = await API.getMonthlyStats();
        const programStats = await API.getProgramStats();

        updateSalesTable(monthlyStats);
        updateMonthlyChart(monthlyStats);
        updateProgramChart(programStats);
    } catch (error) {
        console.error('통계 데이터 로드 실패:', error);
        throw error;
    }
}

function formatCurrency(amount) {
    return Number(amount || 0).toLocaleString('ko-KR');
}

function setupEventListeners() {
    const yearSelect = document.getElementById('yearSelect');
    const monthSelect = document.getElementById('monthSelect');

    // 연도 드롭다운 옵션 생성
    const currentYear = new Date().getFullYear();
    for (let year = 2024; year <= currentYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        yearSelect.appendChild(option);
    }

    // 초기값 설정
    yearSelect.value = currentYear;
    monthSelect.value = new Date().getMonth() + 1;

    yearSelect.addEventListener('change', async () => {
        try {
            await loadFilteredData();
        } catch (error) {
            console.error('필터링 실패:', error);
            API.handleApiError(error);
        }
    });

    monthSelect.addEventListener('change', async () => {
        try {
            await loadFilteredData();
        } catch (error) {
            console.error('필터링 실패:', error);
            API.handleApiError(error);
        }
    });
}

async function loadFilteredData() {
    const year = document.getElementById('yearSelect').value;
    const month = document.getElementById('monthSelect').value;
    
    const monthlyStats = await API.getMonthlyStats();
    const filtered = monthlyStats.filter(stat => {
        const statDate = new Date(stat.month);
        return statDate.getFullYear().toString() === year &&
               (statDate.getMonth() + 1).toString() === month;
    });
    
    updateSalesTable(filtered);
    updateMonthlyChart(monthlyStats); // 전체 데이터로 차트 업데이트
}

function updateSalesTable(data) {
    const tbody = document.querySelector('tbody');
    tbody.innerHTML = '';

    let paidTotal = 0;
    let unpaidTotal = 0;

    data.forEach(stat => {
        const tr = document.createElement('tr');
        const revenue = Number(stat.revenue || 0);

        if (stat.payment_status === 'paid') {
            paidTotal += revenue;
        } else {
            unpaidTotal += revenue;
        }

        tr.innerHTML = `
            <td>${formatCurrency(revenue)}원</td>
            <td>${stat.month}</td>
            <td>${stat.payment_status === 'paid' ? '완납' : '미납'}</td>
        `;
        tbody.appendChild(tr);
    });

    const summaryElement = document.querySelector('.summary');
    if (summaryElement) {
        const totalRevenue = paidTotal + unpaidTotal;
        summaryElement.innerHTML = `
            완납 금액: ${formatCurrency(paidTotal)}원<br>
            미납 금액: ${formatCurrency(unpaidTotal)}원<br>
            총 매출: ${formatCurrency(totalRevenue)}원
        `;
    }
}

function updateMonthlyChart(data) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    if (window.monthlyChart) {
        window.monthlyChart.destroy();
    }

    const monthlyTotals = {};
    data.forEach(item => {
        if (!monthlyTotals[item.month]) {
            monthlyTotals[item.month] = 0;
        }
        monthlyTotals[item.month] += Number(item.revenue || 0);
    });

    const sortedMonths = Object.keys(monthlyTotals).sort();
    const revenues = sortedMonths.map(month => monthlyTotals[month]);

    window.monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: '월별 매출 (원)',
                data: revenues,
                borderColor: '#E56736',
                backgroundColor: 'rgba(229, 103, 54, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `매출: ${formatCurrency(context.raw)}원`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value) + '원';
                        }
                    }
                }
            }
        }
    });
}

function updateProgramChart(data) {
    const ctx = document.getElementById('serviceChart').getContext('2d');
    
    if (window.programChart) {
        window.programChart.destroy();
    }

    const programs = data.map(item => item.name);
    const revenues = data.map(item => Number(item.revenue || 0));
    const students = data.map(item => Number(item.total_students || 0));

    const colors = ['#DF4420', '#C33A20', '#E56736', '#EE8B59'];

    window.programChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: programs,
            datasets: [{
                label: '프로그램별 매출 (원)',
                data: revenues,
                backgroundColor: colors.slice(0, programs.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const program = programs[context.dataIndex];
                            const revenue = revenues[context.dataIndex];
                            const studentCount = students[context.dataIndex];
                            return [
                                `매출: ${formatCurrency(revenue)}원`,
                                `수강생: ${studentCount}명`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value) + '원';
                        }
                    }
                }
            }
        }
    });
}