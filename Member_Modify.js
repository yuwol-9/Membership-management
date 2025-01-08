let selectedProgram = '';
let selectedPaymentStatus = 'unpaid';
let programs = [];

document.addEventListener('DOMContentLoaded', async () => {
    await initializeForm();
    setupEventListeners();
});

async function initializeForm() {
    try {
        // 프로그램 목록 로드
        programs = await API.getPrograms();
        updateProgramSelect();
        
        // URL에서 회원 ID 가져오기
        const urlParams = new URLSearchParams(window.location.search);
        const memberId = urlParams.get('memberId');
        
        if (memberId) {
            const memberData = await API.getMember(memberId);
            fillMemberData(memberData);
        }
    } catch (error) {
        console.error('초기화 실패:', error);
        alert('데이터 로드에 실패했습니다.');
    }
}

function updateProgramSelect() {
    const programSelect = document.getElementById('program');
    programSelect.innerHTML = '<option value="">선택하세요</option>';
    
    programs.forEach(prog => {
        const option = document.createElement('option');
        option.value = prog.id;
        option.textContent = prog.name;
        programSelect.appendChild(option);
    });
}

function fillMemberData(memberData) {
    document.getElementById('name').value = memberData.name || '';
    document.getElementById('phone').value = memberData.phone || '';
    document.getElementById('birthdate').value = memberData.birthdate || '';
    document.getElementById('age').value = memberData.age || '';
    document.getElementById('gender').value = memberData.gender || '';
    document.getElementById('address').value = memberData.address || '';
    document.getElementById('start_date').value = memberData.start_date || '';
    
    if (memberData.program_id) {
        document.getElementById('program').value = memberData.program_id;
    }
    
    if (memberData.payment_status) {
        setPaymentStatus(memberData.payment_status);
    }
    
    // 구독 정보 설정
    if (memberData.total_classes) {
        setSubscription(`${memberData.total_classes}회`);
    } else if (memberData.duration_months) {
        setSubscription(`${memberData.duration_months}개월`);
    }
}

function updateProgramSelection() {
    selectedProgram = document.getElementById('program').value;
    calculateAmount();
}

function setPaymentStatus(status) {
    selectedPaymentStatus = status;
    
    const buttons = document.querySelectorAll('.payment-status button');
    buttons.forEach(button => {
        if (button.dataset.status === status) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });
}

function setSubscription(value) {
    const customInputGroup = document.querySelector('.custom-input-group');
    const subscriptionType = document.getElementById('subscription-type');
    const inputField = document.getElementById('custom-subscription');
    
    customInputGroup.style.display = 'flex';
    
    const match = value.match(/^(\d+)(개월|회)$/);
    if (match) {
        const [, number, unit] = match;
        inputField.value = number;
        
        if (unit === '개월') {
            subscriptionType.value = 'month';
        } else if (unit === '회') {
            subscriptionType.value = 'class';
        }
    }
    
    updateSubscriptionPlaceholder();
    calculateAmount();
}

function enableCustomInput() {
    const customInputGroup = document.querySelector('.custom-input-group');
    const inputField = document.getElementById('custom-subscription');
    
    customInputGroup.style.display = 'flex';
    inputField.value = '';
    updateSubscriptionPlaceholder();
    document.getElementById('amount-display').innerText = '결제 금액: 0원';
}

function updateSubscriptionPlaceholder() {
    const subscriptionType = document.getElementById('subscription-type');
    const inputField = document.getElementById('custom-subscription');
    
    inputField.placeholder = subscriptionType.value === 'month' ? '개월 수 입력' : '횟수 입력';
}

function calculateAmount() {
  const programSelect = document.getElementById('program');
  const subscriptionType = document.getElementById('subscription-type');
  const subscriptionInput = document.getElementById('custom-subscription');
  const amountDisplay = document.getElementById('amount-display');
  
  if (!programSelect.value || !subscriptionInput.value) {
      amountDisplay.innerText = '결제 금액: 0원';
      return;
  }

  const program = programs.find(p => p.id.toString() === programSelect.value);
  if (!program) return;

  let totalAmount = 0;
  const quantity = parseInt(subscriptionInput.value);
  
  if (subscriptionType.value === 'month') {
      totalAmount = quantity * program.monthly_price;
  } else {
      totalAmount = quantity * program.per_class_price;
  }

  amountDisplay.innerText = `결제 금액: ${totalAmount.toLocaleString()}원`;
}

async function updateMember(event) {
  event.preventDefault();
  
  try {
      const urlParams = new URLSearchParams(window.location.search);
      const memberId = urlParams.get('memberId');
      const subscriptionType = document.getElementById('subscription-type');
      const subscriptionInput = document.getElementById('custom-subscription');
      
      const formData = {
          name: document.getElementById('name').value,
          gender: document.getElementById('gender').value,
          birthdate: document.getElementById('birthdate').value,
          age: document.getElementById('age').value,
          address: document.getElementById('address').value,
          phone: document.getElementById('phone').value,
          program_id: document.getElementById('program').value,
          start_date: document.getElementById('start_date').value,
          payment_status: selectedPaymentStatus
      };

      // 구독 유형에 따라 데이터 설정
      if (subscriptionType.value === 'month') {
          formData.duration_months = parseInt(subscriptionInput.value);
          formData.total_classes = null;
      } else {
          formData.duration_months = 1;
          formData.total_classes = parseInt(subscriptionInput.value);
      }

      await API.updateMember(memberId, formData);
      alert('회원 정보가 성공적으로 수정되었습니다.');
      window.location.href = '회원관리.html';
  } catch (error) {
      console.error('회원 정보 수정 실패:', error);
      alert('회원 정보 수정에 실패했습니다. 다시 시도해주세요.');
  }
}

async function deleteMember() {
  if (confirm('정말로 이 회원을 삭제하시겠습니까?')) {
      try {
          const urlParams = new URLSearchParams(window.location.search);
          const memberId = urlParams.get('memberId');
          
          await API.deleteMember(memberId);
          alert('회원이 성공적으로 삭제되었습니다.');
          window.location.href = '회원관리.html';
      } catch (error) {
          console.error('회원 삭제 실패:', error);
          alert('회원 삭제에 실패했습니다. 다시 시도해주세요.');
      }
  }
}

async function addProgram() {
  try {
      const urlParams = new URLSearchParams(window.location.search);
      const memberId = urlParams.get('memberId');
      const subscriptionType = document.getElementById('subscription-type');
      const subscriptionInput = document.getElementById('custom-subscription');
      
      const programData = {
          member_id: memberId,
          program_id: document.getElementById('program').value,
          start_date: document.getElementById('start_date').value,
          payment_status: selectedPaymentStatus
      };

      if (subscriptionType.value === 'month') {
          programData.duration_months = parseInt(subscriptionInput.value);
          programData.total_classes = null;
      } else {
          programData.duration_months = 1;
          programData.total_classes = parseInt(subscriptionInput.value);
      }

      await API.addMemberProgram(memberId, programData);
      alert('프로그램이 성공적으로 추가되었습니다.');
      window.location.reload();
  } catch (error) {
      console.error('프로그램 추가 실패:', error);
      alert('프로그램 추가에 실패했습니다. 다시 시도해주세요.');
  }
}

function setupEventListeners() {
  // 수정 폼 제출 이벤트
  const editForm = document.getElementById('edit-form');
  if (editForm) {
      editForm.addEventListener('submit', updateMember);
  }

  // 회원 삭제 버튼 이벤트
  const deleteButton = document.getElementById('delete-member-btn');
  if (deleteButton) {
      deleteButton.addEventListener('click', deleteMember);
  }

  // 프로그램 추가 버튼 이벤트
  const addProgramButton = document.getElementById('add-program-btn');
  if (addProgramButton) {
      addProgramButton.addEventListener('click', addProgram);
  }

  // 생년월일 변경 시 나이 자동 계산
  const birthdateInput = document.getElementById('birthdate');
  if (birthdateInput) {
      birthdateInput.addEventListener('change', function() {
          const age = calculateAge(this.value);
          document.getElementById('age').value = age;
      });
  }
}

function calculateAge(birthdate) {
  const today = new Date();
  const birthDate = new Date(birthdate);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  
  return age;
}