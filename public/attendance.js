document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 연도 선택 옵션 설정
        const yearSelect = document.getElementById('year');
        const currentYear = new Date().getFullYear();
        
        // 2024년부터 시작하도록 수정
        const startYear = 2024;
        const endYear = 2028;
        
        yearSelect.innerHTML = ''; // 기존 옵션 제거
        
        for (let year = startYear; year <= endYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            yearSelect.appendChild(option);
            
            // 현재 연도를 기본값으로 설정
            if (year === currentYear) {
                option.selected = true;
            }
        }
        
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

    updateTableHeader(daysInMonth);
    const memberAttendance = groupAttendanceByMember(data);
    tableBody.innerHTML = '';

    Object.entries(memberAttendance).forEach(([memberName, attendance]) => {
        const tr = document.createElement('tr');
        
        const tdName = document.createElement('td');
        tdName.textContent = memberName;
        tr.appendChild(tdName);

        for (let day = 1; day <= daysInMonth; day++) {
            const td = document.createElement('td');
            const currentDate = new Date(year, month, day);
            const dayOfWeek = currentDate.getDay();

            if (dayOfWeek === 0) {
                td.classList.add('sunday');
                tr.appendChild(td);
                continue;
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = attendance.dates.includes(day);
            
            // 남은 일수가 0이면 체크박스 비활성화
            if (attendance.remaining_days <= 0 && !checkbox.checked) {
                checkbox.disabled = true;
            }

            checkbox.addEventListener('change', async () => {
                // 체크 시도할 때 남은 일수 확인
                if (checkbox.checked && attendance.remaining_days <= 0) {
                    checkbox.checked = false;
                    alert('남은 수업 일수가 없습니다.');
                    return;
                }

                try {
                    await API.checkAttendance({
                        enrollment_id: attendance.enrollment_id,
                        attendance_date: formatDate(currentDate),
                        is_present: checkbox.checked
                    });
                    
                    await loadAttendanceData();
                } catch (error) {
                    console.error('출석 체크 실패:', error);
                    checkbox.checked = !checkbox.checked;
                    alert(error.message || '출석 처리 중 오류가 발생했습니다');
                }
            });

            td.appendChild(checkbox);
            tr.appendChild(td);
        }

        const tdCount = document.createElement('td');
        tdCount.textContent = attendance.dates.length;
        tr.appendChild(tdCount);
        
        const tdRemaining = document.createElement('td');
        const remainingDays = Math.max(0, attendance.remaining_days); // 음수 방지
        tdRemaining.textContent = remainingDays;
        
        // 남은 일수가 5일 이하면 빨간색으로 표시
        if (remainingDays <= 5 && remainingDays > 0) {
            tdRemaining.style.color = '#ff0000';
            tdRemaining.style.fontWeight = 'bold';
        }

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