let currentProgramId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentProgramId = urlParams.get('id');
    
    if (!currentProgramId) {
        alert('잘못된 접근입니다.');
        window.location.href = '수업관리.html';
        return;
    }

    await loadProgramData();
});

async function loadProgramData() {
    try {
        const program = await API.getProgram(currentProgramId);
        fillProgramData(program);
    } catch (error) {
        console.error('프로그램 데이터 로드 실패:', error);
        alert('프로그램 정보를 불러오는데 실패했습니다.');
    }
}

function fillProgramData(program) {
    document.getElementById('class-name').value = program.name;
    document.getElementById('monthly-price').value = program.monthly_price;
    document.getElementById('per-class-price').value = program.per_class_price;
    document.getElementById('instructor-name').value = program.instructor_name;
    
    // 시간 데이터 채우기
    program.classes.forEach((classInfo, index) => {
        if (index > 0) addTimeSelection();
        const timeSelection = document.querySelectorAll('.time-selection')[index];
        if (timeSelection) {
            timeSelection.querySelector('select[id^="day"]').value = classInfo.day;
            const [startHour, startMinute] = classInfo.startTime.split(':');
            const [endHour, endMinute] = classInfo.endTime.split(':');
            
            timeSelection.querySelector('[id^="start-time"]').value = `${startHour}:${startMinute}`;
            timeSelection.querySelector('[id^="end-time"]').value = `${endHour}:${endMinute}`;
        }
    });

    // 색상 설정
    selectedColor = program.classes[0]?.color || '#E56736';
    document.getElementById('color-preview').style.backgroundColor = selectedColor;
}

async function updateProgram() {
    try {
        // 필수 입력값 검증
        const name = document.getElementById('class-name').value.trim();
        const monthlyPrice = parseInt(document.getElementById('monthly-price').value);
        const perClassPrice = parseInt(document.getElementById('per-class-price').value);
        const timeSelections = getTimeSelections();

        // 필수 입력값 확인
        if (!name) {
            alert('프로그램 이름을 입력해주세요.');
            return;
        }

        if (!monthlyPrice || monthlyPrice <= 0) {
            alert('유효한 개월 수강료를 입력해주세요.');
            return;
        }

        if (!perClassPrice || perClassPrice <= 0) {
            alert('유효한 회당 수강료를 입력해주세요.');
            return;
        }

        if (!timeSelections || timeSelections.length === 0) {
            alert('수업 시간을 선택해주세요.');
            return;
        }

        const programData = {
            name: name,
            instructor_name: document.getElementById('instructor-name').value.trim(),
            monthly_price: monthlyPrice,
            per_class_price: perClassPrice,
            schedules: timeSelections,
            color: selectedColor
        };

        await API.updateProgram(currentProgramId, programData);
        alert('프로그램이 성공적으로 수정되었습니다.');
        window.location.href = '수업관리.html';
    } catch (error) {
        console.error('프로그램 수정 실패:', error);
        alert(error.message || '프로그램 수정에 실패했습니다.');
    }
}

async function checkTimeConflict(day, startTime, endTime, excludeProgramId) {
    try {
        const programs = await API.getPrograms();
        return programs.some(program => {
            if (program.id.toString() === excludeProgramId.toString()) {
                return false; // 현재 수정 중인 프로그램은 제외
            }
            
            return program.classes.some(classInfo => {
                if (classInfo.day !== day) return false;

                const existingStart = convertTimeToMinutes(classInfo.startTime);
                const existingEnd = convertTimeToMinutes(classInfo.endTime);
                const newStart = convertTimeToMinutes(startTime);
                const newEnd = convertTimeToMinutes(endTime);

                return (newStart < existingEnd && newEnd > existingStart);
            });
        });
    } catch (error) {
        console.error('시간 충돌 확인 중 오류:', error);
        throw new Error('시간 충돌 확인 중 오류가 발생했습니다.');
    }
}

function convertTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

async function deleteProgram() {
    if (confirm('정말로 이 프로그램을 삭제하시겠습니까?')) {
        try {
            await API.deleteProgram(currentProgramId);
            alert('프로그램이 성공적으로 삭제되었습니다.');
            window.location.href = '수업관리.html';
        } catch (error) {
            console.error('프로그램 삭제 실패:', error);
            alert('프로그램 삭제에 실패했습니다.');
        }
    }
}

async function confirmSelection() {
    const selections = document.querySelectorAll('.time-selection');
    let hasConflict = false;
    let conflictMessages = [];

    for (const selection of selections) {
        const day = selection.querySelector('select').value;
        
        const startPeriod = selection.querySelector('[id^="start-time-period"]').value;
        const startHour = selection.querySelector('[id^="start-time-hour"]').value;
        const startMinute = selection.querySelector('[id^="start-time-minute"]').value;
        
        const endPeriod = selection.querySelector('[id^="end-time-period"]').value;
        const endHour = selection.querySelector('[id^="end-time-hour"]').value;
        const endMinute = selection.querySelector('[id^="end-time-minute"]').value;

        const startHour24 = startPeriod === '오후' && startHour !== '12' ? 
            parseInt(startHour) + 12 : 
            startPeriod === '오전' && startHour === '12' ? 0 : parseInt(startHour);
        
        const endHour24 = endPeriod === '오후' && endHour !== '12' ? 
            parseInt(endHour) + 12 : 
            endPeriod === '오전' && endHour === '12' ? 0 : parseInt(endHour);

        const startTime = `${startHour24.toString().padStart(2, '0')}:${startMinute}`;
        const endTime = `${endHour24.toString().padStart(2, '0')}:${endMinute}`;

        // 현재 수정 중인 프로그램 ID를 제외하고 시간 충돌 검사
        const conflict = await checkTimeConflict(day, startTime, endTime, currentProgramId);
        if (conflict) {
            hasConflict = true;
            conflictMessages.push(`${day} ${startTime}~${endTime}`);
        }
    }

    if (hasConflict) {
        alert(`다음 시간대에 이미 수업이 존재합니다:\n${conflictMessages.join('\n')}`);
        return;
    }

    // 시간이 유효한 경우 모달 닫기
    alert('시간이 선택되었습니다.');
    closeTimeModal();
}