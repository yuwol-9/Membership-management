const prices = {
  'kpop': {
    '1개월': 150000,
    '3개월': 450000,
    '1회': 50000
  },
  'wacking': {
    '1개월': 140000,
    '3개월': 420000,
    '1회': 48000
  },
  'coyote': {
    '1개월': 160000,
    '3개월': 480000,
    '1회': 60000
  }
};

let selectedProgram = '';

const members = JSON.parse(localStorage.getItem('members')) || [];
const urlParams = new URLSearchParams(window.location.search);
const memberId = urlParams.get('memberId');
const member = members[memberId];

if (member) {
  document.getElementById('name').value = member.name;
  document.getElementById('phone').value = member.phone;
  document.getElementById('birthday').value = member.birthday;
  document.getElementById('age').value = member.age;
  document.getElementById('gender').value = member.gender;
  document.getElementById('address').value = member.address;
  document.getElementById('program').value = member.program;
  document.getElementById('custom-subscription').value = member.subscription;
  document.getElementById('amount-display').innerText = `결제 금액: ${member.payment}`;
}

function setSubscription(value) {
  const inputField = document.getElementById('custom-subscription');
  inputField.value = value;
  inputField.style.display = 'block';
  calculateAmount();
}

function enableCustomInput() {
  const inputField = document.getElementById('custom-subscription');
  inputField.style.display = 'block';
  inputField.value = '';
  document.getElementById('amount-display').innerText = '결제 금액: 0원';
}

function calculateAmount() {
  const inputField = document.getElementById('custom-subscription');
  const value = inputField.value.trim();
  const amountDisplay = document.getElementById('amount-display');

  const match = value.match(/^([0-9]+)(개월|회)$/);
  if (match && selectedProgram) {
    const quantity = parseInt(match[1]);
    const unit = match[2];

    let totalAmount = 0;
    if (unit === '개월') {
      totalAmount = quantity * prices[selectedProgram]['1개월'];
    } else if (unit === '회') {
      totalAmount = quantity * prices[selectedProgram]['1회'];
    }
    amountDisplay.innerText = `결제 금액: ${totalAmount.toLocaleString()}원`;
  } else {
    amountDisplay.innerText = '결제 금액: 0원';
  }
}

function updateProgramSelection() {
  const programSelect = document.getElementById('program');
  selectedProgram = programSelect.value;
  calculateAmount();
}

document.getElementById('edit-form').addEventListener('submit', (e) => {
  e.preventDefault();

  member.name = document.getElementById('name').value;
  member.phone = document.getElementById('phone').value;
  member.birthday = document.getElementById('birthday').value;
  member.age = document.getElementById('age').value;
  member.gender = document.getElementById('gender').value;
  member.address = document.getElementById('address').value;
  member.program = document.getElementById('program').value;
  member.subscription = document.getElementById('custom-subscription').value;
  member.payment = document.getElementById('amount-display').innerText.split(': ')[1];

  members[memberId] = member;
  localStorage.setItem('members', JSON.stringify(members));
  if (!member) {
  alert('회원 데이터를 찾을 수 없습니다.');
  window.location.href = '회원관리.html'; // 다시 회원 관리 페이지로 이동
}

  alert('회원 정보가 수정되었습니다!');
  window.location.href = '회원관리.html';
});

document.getElementById('add-program-btn').addEventListener('click', () => {
  const program = document.getElementById('program').value;
  const subscription = document.getElementById('custom-subscription').value;
  const paymentText = document.getElementById('amount-display').innerText;
  const payment = parseInt(paymentText.replace(/[^0-9]/g, ''), 10);

  // 입력값 검증
  if (!program) {
    alert('프로그램을 선택하세요.');
    return;
  }
  if (!subscription) {
    alert('구독 기간을 입력하세요.');
    return;
  }
  if (!payment || payment <= 0) {
    alert('결제 금액이 올바르지 않습니다.');
    return;
  }

  // 프로그램 배열 초기화
  if (!member.programs) {
    member.programs = [];
  }

  // 프로그램의 한글 이름 매핑
  const programNames = {
    'kpop': 'K-pop',
    'wacking': '왁킹',
    'coyote': '코레오'
  };

  // 프로그램 추가
  member.programs.push({
    program: programNames[program],  // 한글 이름으로 저장
    subscription: subscription,
    payment: payment
  });

  // 최신 프로그램 정보를 기본 정보에도 업데이트
  member.program = programNames[program];
  member.subscription = subscription;
  member.payment = paymentText.split(': ')[1];

  // 로컬 스토리지 업데이트
  members[memberId] = member;
  localStorage.setItem('members', JSON.stringify(members));

  // 확인 메시지와 페이지 이동
  alert(`${programNames[program]} 프로그램이 추가되었습니다!`);
  window.location.href = '회원관리.html';
});

document.getElementById('delete-member-btn').addEventListener('click', () => {
  if (confirm('정말로 이 회원 정보를 삭제하시겠습니까?')) {
    members.splice(memberId, 1);
    localStorage.setItem('members', JSON.stringify(members));
    alert('회원 정보가 삭제되었습니다.');
    window.location.href = '회원관리.html';
  }
});