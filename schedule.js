const title = document.getElementById('title');
const titleInput = document.getElementById('title-input');


// 제목 클릭 시 입력창으로 전환
title.addEventListener('click', () => {
    title.style.display = 'none';
    titleInput.style.display = 'block';
    titleInput.focus();
});

// 입력창에서 엔터키를 누르면 제목으로 저장
titleInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
        saveTitle();
    }
});
//포커스 아웃도 제목 저장
titleInput.addEventListener('blur', () => {
    title.textContent = titleInput.value;
    titleInput.style.display = 'none';
    title.style.display = 'block';
    saveTitle();
});
// 저장 함수
const saveTitle = () => {
    const newTitle = titleInput.value.trim();
    if (newTitle) {
        title.textContent = newTitle;
        localStorage.setItem(TITLE_STORAGE_KEY, newTitle); // 로컬 스토리지에 저장
    }
    titleInput.style.display = "none"; // 입력창 숨기기
    title.style.display = "block"; // 제목 표시
}

let timeSelectionCount = 1;

function openTimeModal() {
    document.getElementById('time-modal').classList.add('active');
    document.getElementById('overlay').classList.add('active');
}

function closeTimeModal() {
    document.getElementById('time-modal').classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
}

function addTimeSelection() {
  const container = document.getElementById('time-selection-container');
  const newSelection = document.createElement('div');
  newSelection.classList.add('time-selection');
  newSelection.id = `time-selection-${timeSelectionCount}`;
  newSelection.innerHTML = `
      <label for="day-${timeSelectionCount}">요일</label>
      <select id="day-${timeSelectionCount}">
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
          <option value="Sunday">Sunday</option>
      </select>

      <label for="start-time-${timeSelectionCount}">시작 시간</label>
      <input type="time" id="start-time-${timeSelectionCount}">

      <label for="end-time-${timeSelectionCount}">종료 시간</label>
      <input type="time" id="end-time-${timeSelectionCount}">
      <button class="remove-btn" onclick="removeTimeSelection(${timeSelectionCount})">一</button>
      <div class="divider"></div>
  `;
  container.appendChild(newSelection);
  timeSelectionCount++;
}
// 시간 선택 제거 함수
function removeTimeSelection(id) {
    const element = document.getElementById(`time-selection-${id}`);
    if (element) {
        element.remove();
    }
}
function confirmSelection() {
    const selections = document.querySelectorAll('.time-selection');
    selections.forEach((selection, index) => {
        const day = selection.querySelector(`#day-${index}`)?.value;
        const startTime = selection.querySelector(`#start-time-${index}`)?.value;
        const endTime = selection.querySelector(`#end-time-${index}`)?.value;
        console.log(`선택된 시간: ${day}, ${startTime} ~ ${endTime}`);
    });

    alert('시간이 선택되었습니다.');
    closeTimeModal();
}

function openModal() {
    document.getElementById('class-modal').classList.add('active');
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('class-modal').classList.remove('active');
    document.getElementById('modal-overlay').classList.remove('active');
}

function closePreview() {
    document.getElementById('preview-modal').classList.remove('active');
    document.getElementById('preview-overlay').classList.remove('active');
}

function createClassElement(data) {
    const { startTime, endTime, className, details, instructor, color } = data;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startPositionMinutes = (startHour - 10) * 110 + startMinute + 80;
    const durationMinutes = (endHour - startHour) * 108 + (endMinute - startMinute);

    const classElement = document.createElement('div');
    classElement.classList.add('class');
    

    classElement.style.top = `${startPositionMinutes}px`;
    classElement.style.height = `${durationMinutes}px`;

    classElement.innerHTML = `
        <div class="time">
            ${startTime} ~ ${endTime}
        </div>
        <div class="content" style = "background-color: ${color};">
            <div class="name" style="white-space: pre-wrap;">${className}</div>
            <div class="details">${details}</div>
        </div>
        <div class="instructor">
            T. ${instructor}
        </div>
    `;

    return classElement;
}


function previewClass() {
    const className = document.getElementById('class-name').value.trim();
    const details = document.getElementById('class-details').value.trim();
    const instructor = document.getElementById('instructor-name').value.trim();
    const timeSelectionContainer = document.getElementById('time-selection-container');
    const timeSelection = timeSelectionContainer.querySelector('.time-selection');
    const day = timeSelection.querySelector('select')?.value;
    const startTime = timeSelection.querySelector('.start-time')?.value;
    const endTime = timeSelection.querySelector('.end-time')?.value;

    if (!className || !details || !instructor || !day || !startTime || !endTime) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    const data = {
        startTime,
        endTime,
        className,
        details,
        instructor,
        color: selectedColor,
    };

    // 실제 요소 생성
    const previewClassElement = createClassElement(data);

    // 기존 미리보기 초기화
    const previewContent = document.getElementById('preview-content');
    previewContent.innerHTML = '';

    // 스타일 초기화
    previewClassElement.style.position = 'static';
    previewClassElement.style.height = 'auto';
    previewClassElement.style.width = 'auto';

    // 미리보기 컨테이너에 추가
    previewContent.appendChild(previewClassElement);

    document.getElementById('preview-modal').classList.add('active');
    document.getElementById('preview-overlay').classList.add('active');
}
function validateClassData(data) {
    return Object.values(data).every(value => value.trim() !== '');
}
let deleteMode = false; // 삭제 모드 상태

// 삭제 모드 토글 함수
function toggleDeleteMode() {
    deleteMode = !deleteMode;
    const deleteBtn = document.getElementById("delete-class-btn");
    
    if (deleteMode) {
        alert("삭제할 수업을 클릭하세요.");
        deleteBtn.style.backgroundColor = "#FF0000";
        enableDeleteMode();
    } else {
        deleteBtn.style.backgroundColor = "#E56736";
        disableDeleteMode();
    }
}
let classData = [];
// 수업 삭제 함수
function deleteClass(day, startTime, endTime) {
// classData 배열에서 해당 수업 제거
classData = classData.filter(
    (c) => !(c.day === day && c.startTime === startTime && c.endTime === endTime)
);

// 로컬 스토리지에 업데이트된 데이터 저장
localStorage.setItem("classData", JSON.stringify(classData));

// 화면 갱신
renderClasses();
}

// 삭제 모드 활성화 함수
function enableDeleteMode() {
document.querySelectorAll(".class").forEach((classElement) => {
    classElement.addEventListener("click", handleClassClick); // 삭제 이벤트 추가
    classElement.style.cursor = "pointer"; // 클릭 가능 표시
    classElement.style.border = "2px solid #ff4d4d"; // 삭제 모드 시 시각적 강조
});
}

// 삭제 모드 비활성화 함수
function disableDeleteMode() {
document.querySelectorAll(".class").forEach((classElement) => {
    classElement.removeEventListener("click", handleClassClick); // 삭제 이벤트 제거
    classElement.style.cursor = "default"; // 기본 커서로 복원
    classElement.style.border = "none"; // 강조 제거
});
}

// 수업 클릭 시 삭제 처리
function handleClassClick(event) {
const classElement = event.currentTarget;

// 수업 정보 가져오기
const time = classElement.querySelector(".time").innerText;
const [startTime, endTime] = time.split(" ~ ");
const dayElement = classElement.closest(".day").querySelector("h2").innerText;

if (
    confirm(
    `정말로 ${dayElement}의 ${startTime} ~ ${endTime} 수업을 삭제하시겠습니까?`
    )
) {
    deleteClass(dayElement, startTime, endTime);
}
}

const RESET_PASSWORD = "woody1234"; // 초기화 비밀번호 설정

function resetClasses() {
    const userInput = prompt("초기화를 위해 비밀번호를 입력하세요:");

    if (userInput === null) {
        // 사용자가 취소를 누른 경우
        alert("초기화가 취소되었습니다.");
        return;
    }

    if (userInput === RESET_PASSWORD) {
        if (confirm("모든 수업을 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            classData = [];
            localStorage.removeItem("classData"); // 로컬 스토리지 데이터 제거
            document.querySelectorAll(".classes").forEach(container => {
                container.innerHTML = ""; // 화면에서 모든 수업 제거
            });
            alert("모든 수업이 초기화되었습니다.");
        }
    } else {
        alert("비밀번호가 올바르지 않습니다. 초기화가 취소되었습니다.");
    }
}

let isPaletteOpen = false; // 팔레트 열림 상태
let selectedColor = "#f94144"; // 기본 색상

// 색상 팔레트 토글
function toggleColorPalette() {
    const palette = document.getElementById("color-palette");
    isPaletteOpen = !isPaletteOpen;
    palette.classList.toggle("hidden", !isPaletteOpen);
}


// 색상 선택 함수
function selectColor(color) {
selectedColor = color; // 선택된 색상 저장

// 미리보기 색상 업데이트
document.getElementById("color-preview").style.backgroundColor = color;

// 팔레트 닫기
toggleColorPalette();
}

async function checkTimeConflict(day, startTime, endTime) {
  return classData.some(existingClass => {
      if (existingClass.day !== day) return false;

      const [existingStart, existingEnd] = [
          new Date(`1970-01-01T${existingClass.startTime}`),
          new Date(`1970-01-01T${existingClass.endTime}`)
      ];

      const [newStart, newEnd] = [
          new Date(`1970-01-01T${startTime}`),
          new Date(`1970-01-01T${endTime}`)
      ];

      return (newStart < existingEnd && newEnd > existingStart);
  });
}


async function addClass() {
  try {
      const programData = {
          name: document.getElementById('class-name').value.trim(),
          instructor_name: document.getElementById('instructor-name').value.trim(),
          monthly_price: parseInt(document.getElementById('monthly-price').value) || 0,
          per_class_price: parseInt(document.getElementById('per-class-price').value) || 0,
          classes_per_week: parseInt(document.getElementById('classes-per-week').value) || 1,
          day: document.querySelector('.time-selection select').value,
          startTime: document.querySelector('.time-selection .start-time').value,
          endTime: document.querySelector('.time-selection .end-time').value,
          details: document.getElementById('class-details').value.trim(),
          color: selectedColor
      };

      if (
          !programData.name ||
          !programData.instructor_name ||
          !programData.details ||
          !programData.day ||
          !programData.startTime ||
          !programData.endTime ||
          !programData.monthly_price ||
          !programData.per_class_price ||
          !programData.classes_per_week
      ) {
          alert('모든 필드를 올바르게 입력해주세요.');
          return;
      }

      if (isNaN(programData.monthly_price) || programData.monthly_price <= 0) {
          alert('개월 수강료는 양수로 입력해주세요.');
          return;
      }

      if (isNaN(programData.per_class_price) || programData.per_class_price <= 0) {
          alert('회당 수강료는 양수로 입력해주세요.');
          return;
      }

      if (!programData.classes_per_week || programData.classes_per_week < 1 || programData.classes_per_week > 7) {
        alert('주간 수업 횟수를 1-7회 사이로 입력해주세요.');
        return;
      }

      const timeConflict = await checkTimeConflict(
          programData.day,
          programData.startTime,
          programData.endTime
      );

      if (timeConflict) {
          alert(`${programData.day}의 ${programData.startTime} ~ ${programData.endTime} 시간대에 이미 다른 수업이 있습니다.`);
          return;
      }

      await API.createProgram(programData);

      alert('프로그램이 성공적으로 등록되었습니다.');
      closeModal();
      await loadPrograms();
  } catch (error) {
      console.error('수업 등록 실패:', error);
      alert('수업 등록에 실패했습니다. 다시 시도해주세요.');
  }
}
  
  async function loadPrograms() {
    try {
      const programs = await API.getPrograms();
      programs.forEach(program => {
        // 프로그램 정보를 화면에 표시
        const dayElements = document.querySelectorAll('.day');
        dayElements.forEach(dayElement => {
          const day = dayElement.querySelector('h2').innerText;
          const classesContainer = dayElement.querySelector('.classes');
  
          program.classes?.forEach(classInfo => {
            if (classInfo.day === day) {
              const classElement = createClassElement({
                startTime: classInfo.startTime,
                endTime: classInfo.endTime,
                className: program.name,
                details: classInfo.details,
                instructor: program.instructor_name,
                color: classInfo.color
              });
              classesContainer.appendChild(classElement);
            }
          });
        });
      });
    } catch (error) {
      console.error('프로그램 목록 로드 실패:', error);
    }
  }
  
  function resetForm() {
    document.getElementById('class-name').value = '';
    document.getElementById('class-details').value = '';
    document.getElementById('instructor-name').value = '';
    document.getElementById('monthly-price').value = '';
    document.getElementById('per-class-price').value = '';
    document.getElementById('color-preview').style.backgroundColor = '#E56736';
    
    const timeSelectionContainer = document.getElementById('time-selection-container');
    timeSelectionContainer.innerHTML = defaultTimeSelectionHTML;
    timeSelectionCount = 1;
  }
  
  // 페이지 로드 시 프로그램 목록 불러오기
  document.addEventListener('DOMContentLoaded', async () => {
    await loadPrograms();
  });


document.getElementById('modal-overlay').addEventListener('click', closeModal);
document.getElementById('preview-overlay').addEventListener('click', closePreview);

document.getElementById('class-modal').addEventListener('click', e => e.stopPropagation());
document.getElementById('preview-modal').addEventListener('click', e => e.stopPropagation());

// 수업 렌더링 함수
function renderClasses() {
document.querySelectorAll('.classes').forEach(container => {
    container.innerHTML = ''; // 기존 데이터를 초기화
});

classData.forEach(data => {
    const { day, startTime, endTime, className, details, instructor,color:selectedColor } = data;
    const dayElement = Array.from(document.querySelectorAll('.day')).find(
    d => d.querySelector('h2').innerText === day
    );

    if (dayElement) {
        const classesContainer = dayElement.querySelector('.classes');
        const newClass = createClassElement({ startTime, endTime, className, details, instructor,color:selectedColor });
        classesContainer.appendChild(newClass);
    }
});
}
const TITLE_STORAGE_KEY = "scheduleTitle";
const DEFAULT_TITLE = "수업 시간표"; 
// 로컬 스토리지에서 데이터 불러오기
window.onload = () => {
const savedData = localStorage.getItem('classData');
const savedTitle = localStorage.getItem(TITLE_STORAGE_KEY);
if (savedData) {
    const savedTitle = localStorage.getItem(TITLE_STORAGE_KEY) || DEFAULT_TITLE; // 저장된 값이 없으면 초기값 사용
    title.textContent = savedTitle; // 저장된 제목으로 설정
    titleInput.value = savedTitle; // 입력창에도 저장된 제목 표시
    classData = JSON.parse(savedData);
    renderClasses();
}
};
