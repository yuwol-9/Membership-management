let selectedProgramId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeAttendance();
        setupEventListeners();
    } catch (error) {
        console.error('출석 데이터 로드 실패:', error);
        alert('데이터를 불러오는데 실패했습니다.');
    }
});

async function initializeAttendance() {
    setupYearSelect();
    setupMonthSelect();
    await loadPrograms();
}

function setupYearSelect() {
    const yearSelect = document.getElementById('year');
    const currentYear = new Date().getFullYear();
    
    const startYear = 2024;
    const endYear = currentYear + 3;
    
    yearSelect.innerHTML = '';
    for (let year = startYear; year <= endYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        if (year === currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
}

function setupMonthSelect() {
    const monthSelect = document.getElementById('month');
    const currentMonth = new Date().getMonth();
    monthSelect.value = currentMonth;
}

async function loadPrograms() {
    try {
        const programs = await API.getPrograms();
        const programList = document.getElementById('program-list');
        programList.innerHTML = '';
        
        programs.forEach(program => {
            const div = document.createElement('div');
            div.className = 'program-item';
            div.textContent = program.name;
            div.onclick = () => selectProgram(program);
            programList.appendChild(div);
        });
    } catch (error) {
        console.error('프로그램 목록 로드 실패:', error);
        throw error;
    }
}

async function selectProgram(program) {
    selectedProgramId = program.id;
    
    // UI 업데이트
    document.querySelectorAll('.program-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // 출석부 표시 및 데이터 로드
    document.querySelector('.attendance-content').style.display = 'block';
    await loadAttendanceData();
}

async function loadAttendanceData() {
    if (!selectedProgramId) return;

    try {
        const year = document.getElementById('year').value;
        const month = document.getElementById('month').value;
        
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
    const table = document.getElementById('attendance-table');
    const year = document.getElementById('year').value;
    const month = document.getElementById('month').value;
    const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();

    // 헤더 업데이트
    updateTableHeader(daysInMonth);

    // 본문 업데이트
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';

    // 회원별 출석 데이터 그룹화
    const memberAttendance = {};
    data.forEach(record => {
        if (!memberAttendance[record.member_name]) {
            memberAttendance[record.member_name] = {
                enrollment_id: record.enrollment_id,
                remaining_days: record.remaining_days,
                dates: []
            };
        }
        if (record.attendance_date) {
            memberAttendance[record.member_name].dates.push(record.attendance_date);
        }
    });

    // 각 회원의 출석 데이터를 테이블에 추가
    Object.entries(memberAttendance).forEach(([memberName, attendance]) => {
        const tr = document.createElement('tr');
        
        // 이름 셀
        const tdName = document.createElement('td');
        tdName.textContent = memberName;
        tr.appendChild(tdName);

        // 각 날짜별 출석 체크박스
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
            
            const isAttended = attendance.dates.some(date => 
                date.split('T')[0] === formattedDate
            );
            checkbox.checked = isAttended;

            if (attendance.remaining_days <= 0 && !isAttended) {
                checkbox.disabled = true;
                checkbox.title = '남은 수업 일수가 없습니다';
            }

            checkbox.addEventListener('change', async (e) => {
                try {
                    const attendanceData = {
                        enrollment_id: attendance.enrollment_id,
                        attendance_date: formattedDate,
                        is_present: checkbox.checked
                    };

                    await API.checkAttendance(attendanceData);
                    await loadAttendanceData();
                } catch (error) {
                    console.error('출석 체크 실패:', error);
                    checkbox.checked = !checkbox.checked;
                    alert(error.message || '출석 처리 중 오류가 발생했습니다.');
                }
            });

            td.appendChild(checkbox);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });
}

function updateTableHeader(daysInMonth) {
    const thead = document.querySelector('.attendance-table thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `<th>회원 이름</th>`;
    
    for (let day = 1; day <= daysInMonth; day++) {
        headerRow.innerHTML += `<th>${day}일</th>`;
    }

    thead.innerHTML = '';
    thead.appendChild(headerRow);
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function setupEventListeners() {
    const yearSelect = document.getElementById('year');
    const monthSelect = document.getElementById('month');

    yearSelect.addEventListener('change', loadAttendanceData);
    monthSelect.addEventListener('change', loadAttendanceData);

    // 페이지 로드시 현재 날짜 설정
    const today = new Date();
    yearSelect.value = today.getFullYear();
    monthSelect.value = today.getMonth();

    // 초기 연도 선택 옵션 설정
    const currentYear = today.getFullYear();
    const startYear = 2024;
    const endYear = currentYear + 3;

    yearSelect.innerHTML = '';
    for (let year = startYear; year <= endYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        if (year === currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }

    // 현재 월 설정
    const currentMonth = today.getMonth();
    monthSelect.value = currentMonth;
}