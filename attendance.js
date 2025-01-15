// 전역 변수로 현재 선택된 프로그램 ID 관리
let selectedProgramId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 연도 선택 옵션 설정
        const yearSelect = document.getElementById('year');
        const currentYear = new Date().getFullYear();
        const startYear = 2024;
        const endYear = 2028;
        
        yearSelect.innerHTML = '';
        
        for (let year = startYear; year <= endYear; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}년`;
            yearSelect.appendChild(option);
            
            if (year === currentYear) {
                option.selected = true;
            }
        }

        // 프로그램 목록을 먼저 로드하고 첫 번째 프로그램 선택
        await loadPrograms();
        setupEventListeners();
        
    } catch (error) {
        console.error('초기화 실패:', error);
        alert('데이터 로드에 실패했습니다.');
    }
});

async function loadPrograms() {
    try {
        const programs = await API.getPrograms();
        const programContainer = document.getElementById('program-items');
        programContainer.innerHTML = '';
        
        if (programs && programs.length > 0) {
            programs.forEach(program => {
                const div = document.createElement('div');
                div.className = 'program-item';
                div.textContent = program.name;
                div.setAttribute('data-program-id', program.id);
                div.onclick = () => selectProgram(program);
                programContainer.appendChild(div);
            });

            // 첫 번째 프로그램을 기본 선택
            selectedProgramId = programs[0].id;
            const firstProgram = document.querySelector('.program-item');
            if (firstProgram) {
                firstProgram.classList.add('selected');
            }
            
            // 선택된 프로그램의 출석 데이터 로드
            await loadAttendanceData();
        }
    } catch (error) {
        console.error('프로그램 목록 로드 실패:', error);
        throw error;
    }
}

//// 드롭다운에서 프로그램 선택 이벤트 처리
//document.getElementById('program-dropdown').addEventListener('change', async (e) => {
//    selectedProgramId = e.target.value; // 선택된 프로그램 ID 업데이트
//    await loadAttendanceData(); // 선택된 프로그램에 맞는 데이터 로드
//});
//
//async function toggleSidebar() { /*깃 수정사항 */ 
//    const sidebar = document.getElementById('sidebar');
//    sidebar.classList.toggle('active');
//}

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
    
    // 선택된 프로그램의 출석 데이터 로드
    await loadAttendanceData();
} */

/* 메뉴를 누르면 사이드바가 나타나게 하고 싶을떄
async function toggleSidebar() { 
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('active');
    }
*/


async function loadAttendanceData() {
    try {
        const month = document.getElementById('month').value;
        const year = document.getElementById('year').value;
        
        // 프로그램 ID를 포함하여 데이터 요청
        const attendanceData = await API.getAttendanceList({
            program_id: selectedProgramId,
            month: parseInt(month) + 1,
            year: year
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
        const checkboxes = []; // 회원별 체크박스 배열 추가
        
        const tdName = document.createElement('td');
        tdName.textContent = memberName;
        tr.appendChild(tdName);

        // 날짜별 체크박스 생성
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
                formatDate(new Date(date)) === formattedDate
            );
            checkbox.checked = isAttended;

            // 남은 횟수가 0이고 체크되지 않은 경우 비활성화
            if (attendance.remaining_days <= 0 && !isAttended) {
                checkbox.disabled = true;
                checkbox.title = '남은 수업 일수가 없습니다';
            }

            checkboxes.push(checkbox); // 체크박스 배열에 추가

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

                    const response = await API.checkAttendance(attendanceData);
                    
                    // 출석 상태에 따라 남은 일수 업데이트
                    if (checkbox.checked) {
                        attendance.dates.push(formattedDate);
                        attendance.remaining_days--;
                    } else {
                        attendance.dates = attendance.dates.filter(date => 
                            formatDate(new Date(date)) !== formattedDate
                        );
                        attendance.remaining_days++;
                    }

                    // 출석 횟수와 남은 일수 업데이트
                    const countCell = tr.querySelector('td:nth-last-child(2)');
                    const remainingCell = tr.querySelector('td:nth-last-child(1)');
                    
                    countCell.textContent = attendance.dates.length;
                    remainingCell.textContent = attendance.remaining_days;

                    // 남은 일수가 0이 되면 모든 미체크 체크박스 비활성화
                    checkboxes.forEach(cb => {
                        if (attendance.remaining_days <= 0) {
                            cb.disabled = !cb.checked;
                            cb.title = cb.disabled ? '남은 수업 일수가 없습니다' : '';
                            remainingCell.style.color = 'red';
                        } else {
                            cb.disabled = false;
                            cb.title = '';
                            remainingCell.style.color = attendance.remaining_days <= 3 ? '#E56736' : '';
                        }
                    });

                } catch (error) {
                    console.error('출석 체크 실패:', error);
                    checkbox.checked = !checkbox.checked;
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
        if (remainingDays === 0) {
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
        ${Array.from({length: daysInMonth}, (_, i) => {
            const day = new Date(document.getElementById('year').value, 
                               document.getElementById('month').value, i + 1);
            const dayClass = day.getDay() === 0 ? 'sunday' : '';
            return `<th class="${dayClass}">${i + 1}일</th>`;
        }).join('')}
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
                dates: curr.attendance_dates || []
            };
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
function updateTableHeader(daysInMonth) {
    const thead = document.querySelector('.attendance-table thead');
    thead.innerHTML = '';

    // 날짜 행
    const dateRow = document.createElement('tr');

    // 요일 행
    const dayRow = document.createElement('tr');

    // 첫 번째 열: "회원 이름"
    const nameHeader = document.createElement('th');
    nameHeader.rowSpan = 2; // 두 행을 병합
    nameHeader.textContent = '회원 이름';
    dateRow.appendChild(nameHeader);

    // 날짜와 요일 열 추가
    for (let i = 1; i <= daysInMonth; i++) {
        const year = document.getElementById('year').value;
        const month = document.getElementById('month').value;

        // 현재 날짜 객체 생성
        const currentDate = new Date(year, parseInt(month), i);
        const weekday = currentDate.getDay(); // 요일 (0: 일요일, 6: 토요일)

        // 날짜 열
        const dateTh = document.createElement('th');
        dateTh.textContent = `${i}일`;
        dateTh.className = weekday === 0 ? 'sunday' : weekday === 6 ? 'saturday' : ''; // 일요일 빨간색, 토요일 파란색
        dateRow.appendChild(dateTh);

        // 요일 열
        const dayTh = document.createElement('th');
        dayTh.textContent = ['일', '월', '화', '수', '목', '금', '토'][weekday]; // 요일 배열로 변환
        dayTh.className = weekday === 0 ? 'sunday' : weekday === 6 ? 'saturday' : ''; // 일요일 빨간색, 토요일 파란색
        dayRow.appendChild(dayTh);
    }

    // 마지막 열: "출석 횟수"와 "남은 일수"
    const attendanceHeader = document.createElement('th');
    attendanceHeader.rowSpan = 2;
    attendanceHeader.textContent = '출석 횟수';
    dateRow.appendChild(attendanceHeader);

    const remainingHeader = document.createElement('th');
    remainingHeader.rowSpan = 2;
    remainingHeader.textContent = '남은 일수';
    dateRow.appendChild(remainingHeader);

    // 테이블 헤더에 행 추가
    thead.appendChild(dateRow);
    thead.appendChild(dayRow);
}
