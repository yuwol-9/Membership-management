document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadAttendanceData();
        setupEventListeners();
    } catch (error) {
        console.error('출석 데이터 로드 실패:', error);
        API.handleApiError(error);
    }
});

async function loadAttendanceData() {
    try {
        const month = document.getElementById('month').value;
        const year = document.getElementById('year').value;
        
        const attendanceData = await API.getAttendanceList({
            month: parseInt(month) + 1,
            year: year
        });
        
        updateAttendanceTable(attendanceData);
    } catch (error) {
        console.error('출석 데이터 로드 실패:', error);
        throw error;
    }
}

function updateAttendanceTable(data) {
    const tableBody = document.querySelector('.attendance-table tbody');
    const year = document.getElementById('year').value;
    const month = document.getElementById('month').value;
    const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();

    // 헤더 업데이트
    updateTableHeader(daysInMonth);

    // 데이터 그룹화
    const memberAttendance = groupAttendanceByMember(data);
    tableBody.innerHTML = '';

    // 각 회원별 행 생성
    Object.entries(memberAttendance).forEach(([memberName, attendance]) => {
        const tr = document.createElement('tr');
        
        // 회원 이름 열
        const tdName = document.createElement('td');
        tdName.textContent = memberName;
        tr.appendChild(tdName);

        // 날짜별 체크박스
        for (let day = 1; day <= daysInMonth; day++) {
            const td = document.createElement('td');
            const currentDate = new Date(year, month, day);
            
            // 주말인 경우 클래스 추가
            if (isWeekend(currentDate)) {
                td.classList.add('weekend');
            }

            // 체크박스 추가
            if (!isWeekend(currentDate) && !isFutureDate(currentDate)) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = attendance.dates.includes(day);
                checkbox.disabled = isFutureDate(currentDate);

                checkbox.addEventListener('change', async () => {
                    try {
                        const token = API.getToken();
                        if (!token) {
                            throw new Error('로그인이 필요합니다');
                        }
                
                        const formattedDate = formatDate(currentDate);
                        
                        // 요청 데이터 로깅
                        console.log('Sending attendance data:', {
                            enrollment_id: attendance.enrollment_id,
                            attendance_date: formattedDate,
                            is_present: checkbox.checked
                        });
                
                        const response = await fetch(`${API.API_BASE_URL}/attendance`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                enrollment_id: attendance.enrollment_id,
                                attendance_date: formattedDate,
                                is_present: checkbox.checked
                            })
                        });
                
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                        }
                
                        const result = await response.json();
                        console.log('Server response:', result);
                
                        // 성공적으로 처리된 경우만 데이터 새로고침
                        await loadAttendanceData();
                    } catch (error) {
                        console.error('출석 체크 실패:', error);
                        // 체크박스 상태 되돌리기
                        checkbox.checked = !checkbox.checked;
                        // 사용자에게 오류 알림
                        alert(error.message || '출석 처리 중 오류가 발생했습니다');
                    }
                });

                td.appendChild(checkbox);
            }

            tr.appendChild(td);
        }

        // 출석횟수와 남은 일수
        const tdCount = document.createElement('td');
        tdCount.textContent = attendance.dates.length;
        
        const tdRemaining = document.createElement('td');
        tdRemaining.textContent = attendance.remaining_days || '-';
        
        tr.appendChild(tdCount);
        tr.appendChild(tdRemaining);

        tableBody.appendChild(tr);
    });
}

function updateTableHeader(daysInMonth) {
    const thead = document.querySelector('.attendance-table thead');
    thead.innerHTML = '';

    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>회원 이름</th>
        ${Array.from({length: daysInMonth}, (_, i) => `<th>${i + 1}일</th>`).join('')}
        <th>출석횟수</th>
        <th>남은일수</th>
    `;

    thead.appendChild(headerRow);
}

function groupAttendanceByMember(data) {
    return data.reduce((acc, curr) => {
        if (!acc[curr.member_name]) {
            acc[curr.member_name] = {
                enrollment_id: curr.enrollment_id,
                remaining_days: curr.remaining_days,
                dates: []
            };
        }
        
        if (curr.attendance_date) {
            const date = new Date(curr.attendance_date);
            acc[curr.member_name].dates.push(date.getDate());
        }
        
        return acc;
    }, {});
}

function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

function isFutureDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function setupEventListeners() {
    document.getElementById('year').addEventListener('change', loadAttendanceData);
    document.getElementById('month').addEventListener('change', loadAttendanceData);
}