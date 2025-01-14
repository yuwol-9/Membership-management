let selectedProgram = '';
let selectedPaymentStatus = '';
let programs = [];

document.addEventListener('DOMContentLoaded', async () => {
    await initializeForm();
    setupEventListeners();
});

async function initializeForm() {
    try {
        programs = await API.getPrograms();
        updateProgramSelect();

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('start_date').value = today;
        
        const urlParams = new URLSearchParams(window.location.search);
        const memberId = urlParams.get('id');
        
        if (memberId) {
            const memberData = await API.getMember(memberId);
            if (memberData) {
                fillMemberData(memberData);
            } else {
                throw new Error('회원 정보를 찾을 수 없습니다.');
            }
        } else {
            throw new Error('회원 ID가 제공되지 않았습니다.');
        }
    } catch (error) {
        console.error('초기화 실패:', error);
        alert('데이터 로드에 실패했습니다: ' + error.message);
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
    document.getElementById('name').disabled = true;

    document.getElementById('phone').value = memberData.phone || '';
    document.getElementById('phone').disabled = true;

    document.getElementById('birthdate').value = memberData.birthdate ? memberData.birthdate.split('T')[0] : '';
    document.getElementById('birthdate').disabled = true;

    document.getElementById('age').value = memberData.age || '';
    document.getElementById('age').disabled = true;

    document.getElementById('gender').value = memberData.gender || '';
    document.getElementById('gender').disabled = true;

    document.getElementById('address').value = memberData.address || '';
    document.getElementById('address').disabled = true;
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
    const customSubscription = document.getElementById('custom-subscription');
    
    customSubscription.placeholder = subscriptionType.value === 'month' ? '개월 수 입력' : '횟수 입력';
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
    let quantity = parseInt(subscriptionInput.value);
    
    if (subscriptionType.value === 'month') {
        totalAmount = quantity * program.monthly_price;
        const totalClasses = quantity * 4 * program.classes_per_week; // 한 달을 4주로 계산
        subscriptionInput.setAttribute('data-total-classes', totalClasses);
    } else {
        totalAmount = quantity * program.per_class_price;
        subscriptionInput.setAttribute('data-total-classes', quantity);
    }

    amountDisplay.innerText = `결제 금액: ${totalAmount.toLocaleString()}원`;
    return totalAmount;
}

async function addProgram() {
  try {
      const urlParams = new URLSearchParams(window.location.search);
      const memberId = urlParams.get('id');
      const subscriptionType = document.getElementById('subscription-type');
      const subscriptionInput = document.getElementById('custom-subscription');
      
      const programData = {
          member_id: memberId,
          program_id: document.getElementById('program').value,
          start_date: document.getElementById('start_date').value,
          payment_status: selectedPaymentStatus
      };

      if (!programData.program_id) {
          alert('수업을 선택해주세요.');
          return;
      }
      if (!programData.start_date) {
        alert('등록 날짜를 선택해주세요.');
        return;
      }
      if (!programData.payment_status) {
        alert('결제 상태를 골라주세요.');
        return;
      };
      if (!subscriptionInput || !subscriptionInput.value) {
          alert('구독 기간/횟수를 입력해주세요.');
          return;
      }

      if (subscriptionType.value === 'month') {
          programData.duration_months = parseInt(subscriptionInput.value);
          programData.total_classes = null;
      } else {
          programData.duration_months = null;
          programData.total_classes = parseInt(subscriptionInput.value);
      }

      await API.addMemberProgram(memberId, programData);
      alert('수업이 성공적으로 추가되었습니다.');
      window.location.href = '/회원관리.html';
  } catch (error) {
      console.error('수업 추가 실패:', error);
      alert('수업 추가에 실패했습니다. 다시 시도해주세요.');
  }
}

function setupEventListeners() {
    // 수업 추가 버튼 이벤트
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