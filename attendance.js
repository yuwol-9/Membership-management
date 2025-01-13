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
    
    yearSelect.innerHTML = '';
    for (let year = 2024; year <= currentYear + 3; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        if (year === currentYear) option.selected = true;
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
        const container = document.querySelector('.program-select');
        container.innerHTML = '';
        
        programs.forEach(program => {
            const div = document.createElement('div');
            div.className = 'program-item';
            div.textContent = program.name;
            div.dataset.programId = program.id;
            div.onclick = () => selectProgram(program);
            container.appendChild(div);
        });
    } catch (error) {
        console.error('프로그램 목록 로드 실패:', error);
        throw error;
    }
}

async function selectProgram(program) {
    // UI 업데이트
    document.querySelectorAll('.program-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // 해당 프로그램의 출석부 로드
    const year = document.getElementById('year').value;
    const month = document.getElementById('month').value;
    
    try {
        const attendanceData = await API.getAttendanceList({
            month: parseInt(month) + 1,
            year: year,
            program_id: program.id
        });

        updateAttendanceTable(attendanceData);
    } catch (error) {
        console.error('출석 데이터 로드 실패:', error);
        alert('출석 데이터를 불러오는데 실패했습니다.');
    }
}

function updateAttendanceTable(data) {
    const table = document.querySelector('.attendance-table');
    const year = document.getElementById('year').value;
    const month = document.getElementById('month').value;
    const daysInMonth = new Date(year, parseInt(month) + 1, 0).getDate();

    // 헤더 업데이트
    const thead = table.querySelector('thead tr');
    thead.innerHTML = '<th>회원 이름</th>';
    for (let day = 1; day <= daysInMonth; day++) {
        thead.innerHTML += `<th>${day}일</th>`;
    }

    // 출석 데이터 그룹화
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

    // 본문 업데이트
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';

    Object.entries(memberAttendance).forEach(([memberName, attendance]) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${memberName}</td>`;

        for (let day = 1; day <= daysInMonth; day++) {
            const td = document.createElement('td');
            const date = new Date(year, month, day);
            
            if (date.getDay() === 0) {
                td.classList.add('sunday');
                tr.appendChild(td);
                continue;
            }

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            const formattedDate = formatDate(date);

            // 출석 여부 확인
            checkbox.checked = attendance.dates.includes(formattedDate);

            // 남은 일수 체크
            if (attendance.remaining_days <= 0 && !checkbox.checked) {
                checkbox.disabled = true;
                checkbox.title = '남은 수업 일수가 없습니다';
            }

            // 출석 체크 이벤트
            checkbox.addEventListener('change', async () => {
                try {
                    await API.checkAttendance({
                        enrollment_id: attendance.enrollment_id,
                        attendance_date: formattedDate,
                        is_present: checkbox.checked
                    });
                } catch (error) {
                    console.error('출석 체크 실패:', error);
                    checkbox.checked = !checkbox.checked;
                    alert('출석 처리 중 오류가 발생했습니다.');
                }
            });

            td.appendChild(checkbox);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    });
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function setupEventListeners() {
    const yearSelect = document.getElementById('year');
    const monthSelect = document.getElementById('month');

    yearSelect.addEventListener('change', refreshAttendance);
    monthSelect.addEventListener('change', refreshAttendance);
}

async function refreshAttendance() {
    const selectedProgram = document.querySelector('.program-item.selected');
    if (selectedProgram) {
        // 현재 선택된 프로그램의 출석부 새로고침
        await selectProgram({ 
            id: selectedProgram.dataset.programId,
            name: selectedProgram.textContent 
        });
    }
}