document.addEventListener('DOMContentLoaded', async () => {
    try {
        const stats = await API.getDashboardStats();
        updateDashboardCards(stats);
        
        const monthlyStats = await API.getMonthlyStats();
        if (document.getElementById('salesChart')) {
            updateMonthlyRevenueChart(monthlyStats);
        }
    } catch (error) {
        console.error('대시보드 통계 로드 실패:', error);
    }
    setupAuthCheck();
});

function updateDashboardCards(stats) {
    const cards = document.querySelectorAll('.dashboard-cards .card');
    cards.forEach(card => {
        const title = card.querySelector('h3').textContent;
        const valueElement = card.querySelector('p');
        
        switch(title) {
            case '총 회원 수':
                valueElement.textContent = `${stats.totalMembers}명`;
                break;
            case '수업 진행 중':
                valueElement.textContent = `${stats.totalClasses}개 클래스`;
                break;
            case '이번 달 매출':
                const totalRevenue = stats.monthlyRevenue || 0;
                valueElement.textContent = new Intl.NumberFormat('ko-KR', {
                    style: 'currency',
                    currency: 'KRW'
                }).format(totalRevenue);
                break;
            case '오늘 스케줄':
                valueElement.textContent = `${stats.todayAttendance}회 수업`;
                break;
        }
    });
}

function updateMonthlyRevenueChart(monthlyStats) {
    const ctx = document.querySelector('.chart canvas')?.getContext('2d');
    if (!ctx) return;

    const months = monthlyStats.map(stat => stat.month);
    const revenues = monthlyStats.map(stat => stat.revenue);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: '월별 매출',
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
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₩' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function setupAuthCheck() {
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        const token = localStorage.getItem('token');
        if (token) {
            loginBtn.textContent = '로그아웃';
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                window.location.reload();
            });
        } else {
            loginBtn.textContent = '로그인';
        }
    }
}