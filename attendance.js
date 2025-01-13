// attendance.js
let selectedProgramId = null;
let selectedMemberId = null;

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
    await loadPrograms();
    
    // 현재 월 설정
    const currentMonth = new Date().getMonth();
    document.getElementById('month').value = currentMonth;
}

function setupYearSelect() {
    const yearSelect = document.getElementById('year');
    const currentYear = new Date().getFullYear();
    
    // 2024년부터 현재 연도+3년까지 옵션 생성
    const startYear = 2024;
    const endYear = currentYear + 3;
    
    yearSelect.innerHTML = '';
    for (let year = startYear; year <= endYear; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        yearSelect.appendChild(option);
    }
    
    yearSelect.value = currentYear;
}

async function loadPrograms() {
    try {
        const programs = await API.getPrograms();
        updateProgramList(programs);
    } catch (error) {
        console.error('프로그램 목록 로드 실패:', error);
        throw error;
    }
}

function updateProgramList(programs) {
    const programSelect = document.getElementById('program-select');
    programSelect.innerHTML = '';
    
    programs.forEach(program => {
        const div = document.createElement('div');
        div.className = 'program-item';
        div.textContent = program.name;
        div.onclick = () => selectProgram(program);
        programSelect.appendChild(div);
    });
}

async function selectProgram(program) {
    selectedProgramId = program.id;
    
    // UI 업데이트
    document.querySelectorAll('.program-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // 회원 목록 표시
    const memberList = document.querySelector('.member-list');
    memberList.style.display = 'block';
    
    // 해당 프로그램의 회원 목록 로드
    await loadProgramMembers(program.id);
}

async function loadProgramMembers(programId) {
    try {
        const members = await API.getMembers();
        const programMembers = members.filter(member => 
            member.programs.some(p => p.id === programId)
        );
        
        updateMemberList(programMembers);
    } catch (error) {
        console.error('회원 목록 로드 실패:', error);
        alert('회원 목록을 불러오는데 실패했습니다.');
    }
}

function updateMemberList(members) {
    const memberList = document.getElementById('member-list-content');
    memberList.innerHTML = '';

    members.forEach(member => {
        const div = document.createElement('div');
        div.className = 'member-item';
        div.textContent = member.name;
        div.onclick = () => selectMember(member);
        memberList.appendChild(div);
    });
}

async function selectMember(member) {
    selectedMemberId = member.id;

    // UI 업데이트
    document.querySelectorAll('.member-item').forEach(item => {
        item.classList.remove('selected');
    });
    event.target.classList.add('selected');

    // 출석부 표시
    document.querySelector('.attendance-content').style.display = 'block';

    // 출석 데이터 로드
    await loadAttendanceData();
}

async function loadAttendanceData() {
    if (!selectedProgramId || !selectedMemberId) return;

    try {
        const year = document.getElementById('year').value;
        const month = document.getElementById('month').value;
        
        const attendanceData = await API.getAttendanceList({
            month: parseInt(month) + 1,
            year: year,
            member_id: selectedMemberId,
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

    // 회원별 출석 데이터 생성
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
            
            // 일요일인 경우
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

            // 남은 수업 일수가 0이고 미출석인 경우 체크박스 비활성화
            if (attendance.remaining_days <= 0 && !isAttended) {
                checkbox.disabled = true;
                checkbox.title = '남은 수업 일수가 없습니다';
            }

            // 체크박스 이벤트 리스너
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
    document.getElementById('year').addEventListener('change', loadAttendanceData);
    document.getElementById('month').addEventListener('change', loadAttendanceData);
}