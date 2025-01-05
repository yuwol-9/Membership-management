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
            <td>${stat.program_name || '-'}</td>
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

function setupEventListeners() {
    const filterSelect = document.querySelector('.filters select');
    const dateInput = document.querySelector('.filters input[type="date"]');

    if (filterSelect) {
        filterSelect.addEventListener('change', async () => {
            try {
                const monthlyStats = await API.getMonthlyStats();
                const filtered = filterSelect.value === 'all' 
                    ? monthlyStats 
                    : monthlyStats.filter(stat => stat.payment_status === filterSelect.value);
                
                updateSalesTable(filtered);
                updateMonthlyChart(filtered);
            } catch (error) {
                console.error('필터링 실패:', error);
                API.handleApiError(error);
            }
        });
    }

    if (dateInput) {
        dateInput.addEventListener('change', async () => {
            try {
                const selectedDate = new Date(dateInput.value);
                const monthlyStats = await API.getMonthlyStats();
                const filtered = monthlyStats.filter(stat => {
                    const statDate = new Date(stat.month);
                    return statDate.getMonth() === selectedDate.getMonth() &&
                           statDate.getFullYear() === selectedDate.getFullYear();
                });
                
                updateSalesTable(filtered);
                updateMonthlyChart(filtered);
            } catch (error) {
                console.error('날짜 필터링 실패:', error);
                API.handleApiError(error);
            }
        });
    }
}