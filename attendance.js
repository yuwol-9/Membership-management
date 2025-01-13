let selectedProgramId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
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
        console.log('받아온 프로그램 목록:', programs);
        
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

            selectedProgramId = programs[0].id;
            const firstProgram = document.querySelector('.program-item');
            if (firstProgram) {
                firstProgram.classList.add('selected');
            }
            
            await loadAttendanceData();
        }
    } catch (error) {
        console.error('프로그램 목록 로드 실패:', error);
        throw error;
    }
}

async function selectProgram(program) {
    selectedProgramId = program.id;
    document.querySelectorAll('.program-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = document.querySelector(`[data-program-id="${program.id}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    await loadAttendanceData();
}

async function loadAttendanceData() {
    try {
        const month = document.getElementById('month').value;
        const year = document.getElementById('year').value;
        
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
            
            const isAttended = attendance.dates.some(date => 
                date.split('T')[0] === formattedDate
            );
            checkbox.checked = isAttended;

            if (attendance.remaining_days <= 0) {
                checkbox.disabled = !isAttended;
                checkbox.title = isAttended ? '' : '남은 수업 일수가 없습니다';
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

                    await API.checkAttendance(attendanceData);
                    
                    // UI 즉시 업데이트
                    if (checkbox.checked) {
                        attendance.dates.push(formattedDate);
                        attendance.remaining_days--;
                    } else {
                        attendance.dates = attendance.dates.filter(date => 
                            date.split('T')[0] !== formattedDate
                        );
                        attendance.remaining_days++;
                    }
                    
                    // 출석 횟수와 남은 일수 업데이트
                    const countCell = tr.querySelector('td:nth-last-child(2)');
                    const remainingCell = tr.querySelector('td:nth-last-child(1)');
                    
                    countCell.textContent = attendance.dates.length;
                    remainingCell.textContent = attendance.remaining_days;

                    if (attendance.remaining_days <= 0) {
                        tr.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                            if (!cb.checked) {
                                cb.disabled = true;
                                cb.title = '남은 수업 일수가 없습니다';
                            }
                        });
                    } else {
                        tr.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                            cb.disabled = false;
                            cb.title = '';
                        });
                    }
                    
                    if (attendance.remaining_days === 0) {
                        remainingCell.style.color = 'red';
                    } else if (attendance.remaining_days <= 3) {
                        remainingCell.style.color = '#E56736';
                    } else {
                        remainingCell.style.color = '';
                    }

                } catch (error) {
                    console.error('출석 체크 실패:', error);
                    checkbox.checked = !checkbox.checked;
                    alert(error.message || '출석 처리 중 오류가 발생했습니다.');
                }
            });

            td.appendChild(checkbox);
            tr.appendChild(td);
        }

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
            const dayClass = new Date(document.getElementById('year').value, document.getElementById('month').value, i + 1).getDay() === 0 ? 'sunday' : '';
            return `<th class="${dayClass}">${i + 1}일</th>`;
        }).join('')}
        <th>출석횟수</th>
        <th>남은일수</th>
    `;
    thead.appendChild(headerRow);
}

function setupEventListeners() {
    document.getElementById('year').addEventListener('change', loadAttendanceData);
    document.getElementById('month').addEventListener('change', loadAttendanceData);
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