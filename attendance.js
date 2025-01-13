let selectedProgramId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        setupYearSelect();
        setupMonthSelect();
        await loadPrograms();
        setupEventListeners();
    } catch (error) {
        console.error('출석 데이터 로드 실패:', error);
        API.handleApiError(error);
    }
});

async function loadPrograms() {
    try {
        const programs = await API.getPrograms();
        const programContainer = document.getElementById('program-items');
        programContainer.innerHTML = '';
        
        programs.forEach(program => {
            const div = document.createElement('div');
            div.className = 'program-item';
            div.textContent = program.name;
            div.dataset.programId = program.id;
            div.onclick = () => selectProgram(program);
            programContainer.appendChild(div);
        });

        // 첫 번째 프로그램 자동 선택
        if (programs.length > 0) {
            selectProgram(programs[0]);
        }
    } catch (error) {
        console.error('프로그램 목록 로드 실패:', error);
        alert('프로그램 목록을 불러오는데 실패했습니다.');
    }
}

async function selectProgram(program) {
    selectedProgramId = program.id;
    
    // UI 업데이트
    document.querySelectorAll('.program-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = document.querySelector(`[data-program-id="${program.id}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    // 선택된 프로그램의 출석부 데이터 로드
    await loadAttendanceData();
}

async function loadAttendanceData() {
    if (!selectedProgramId) return;

    try {
        const month = document.getElementById('month').value;
        const year = document.getElementById('year').value;
        
        const attendanceData = await API.getAttendanceList({
            month: parseInt(month) + 1,
            year: year,
            program_id: selectedProgramId
        });
        
        updateAttendanceTable(attendanceData);
    } catch (error) {
        console.error('출석 데이터 로드 실패:', error);
        alert('출석 데이터를 불러오는데 실패했습니다.');
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
            const formattedDate = formatDate(currentDate);
            
            if (currentDate.getDay() === 0) {
                td.classList.add('sunday');
                tr.appendChild(td);
                continue;
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            
            // 출석 여부 확인
            const isAttended = attendance.dates.some(date => {
                return date.split('T')[0] === formattedDate;
            });
            checkbox.checked = isAttended;

            if (attendance.remaining_days <= 0 && !isAttended) {
                checkbox.disabled = true;
                checkbox.title = '남은 수업 일수가 없습니다';
            }

            checkbox.addEventListener('change', async (e) => {
                try {
                    if (!attendance.enrollment_id) {
                        throw new Error('수강 정보를 찾을 수 없습니다.');
                    }

                    const attendanceData = {
                        enrollment_id: attendance.enrollment_id,
                        attendance_date: formattedDate,
                        is_present: checkbox.checked
                    };

                    console.log('출석 데이터 전송:', attendanceData);

                    await API.checkAttendance(attendanceData);
                    await loadAttendanceData(); // 데이터 새로고침
                } catch (error) {
                    console.error('출석 체크 실패:', error);
                    checkbox.checked = !checkbox.checked; // 체크 상태 되돌리기
                    alert(error.message || '출석 처리 중 오류가 발생했습니다.');
                }
            });

            td.appendChild(checkbox);
            tr.appendChild(td);
        }

        // 출석 횟수와 남은 일수 표시
        const tdCount = document.createElement('td');
        tdCount.textContent = attendance.dates.length;
        tr.appendChild(tdCount);
        
        const tdRemaining = document.createElement('td');
        const remainingDays = Math.max(0, attendance.remaining_days);
        tdRemaining.textContent = remainingDays;
        if (remainingDays == 0) {
            tdRemaining.style.color = 'red';
        } else if (remainingDays <= 3) {
            tdRemaining.style.color = '#E56736';
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
            acc[curr.member_name].dates.push(curr.attendance_date);
        }
        
        return acc;
    }, {});
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function setupEventListeners() {
    document.getElementById('year').addEventListener('change', loadAttendanceData);
    document.getElementById('month').addEventListener('change', loadAttendanceData);
}