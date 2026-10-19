document.addEventListener('DOMContentLoaded', () => {
  const createSection = document.getElementById('create-section');
  const pollSection = document.getElementById('poll-section');
  const createForm = document.getElementById('create-form');
  const addOptionBtn = document.getElementById('add-option-btn');
  const optionsContainer = document.getElementById('options-container');
  const newPollLink = document.getElementById('new-poll-link');

  const pollTitle = document.getElementById('poll-title');
  const pollDesc = document.getElementById('poll-desc');
  const pollStatusBadge = document.getElementById('poll-status-badge');
  const pinGate = document.getElementById('pin-gate');
  const voterPinInput = document.getElementById('voter-pin');
  const verifyPinBtn = document.getElementById('verify-pin-btn');
  const pinError = document.getElementById('pin-error');
  const votingBox = document.getElementById('voting-box');
  const voteForm = document.getElementById('vote-form');
  const voteOptionsList = document.getElementById('vote-options-list');
  const resultsBox = document.getElementById('results-box');
  const resultsChart = document.getElementById('results-chart');
  const shareLinkBtn = document.getElementById('share-link-btn');
  const closePollBtn = document.getElementById('close-poll-btn');

  let currentSlug = null;
  let verifiedPin = null;

  // Add option field dynamically
  addOptionBtn.addEventListener('click', () => {
    const count = optionsContainer.querySelectorAll('.option-input').length + 1;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'option-input';
    input.required = true;
    input.placeholder = `Lựa chọn ${count}`;
    optionsContainer.appendChild(input);
  });

  // Handle create poll
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const pin = document.getElementById('pin').value;
    const optionInputs = optionsContainer.querySelectorAll('.option-input');
    const options = Array.from(optionInputs).map(i => i.value).filter(v => v.trim() !== '');

    if (options.length < 2) {
      alert('Vui lòng nhập ít nhất 2 lựa chọn.');
      return;
    }

    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, pin, options })
      });
      const data = await res.json();
      if (res.ok) {
        window.location.hash = `#${data.slug}`;
      } else {
        alert(data.error || 'Lỗi khi tạo cuộc khảo sát');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ');
    }
  });

  // Check URL hash for poll slug
  async function checkRoute() {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      currentSlug = hash.substring(1);
      await loadPoll(currentSlug);
    } else {
      createSection.style.display = 'block';
      pollSection.style.display = 'none';
    }
  }

  async function loadPoll(slug) {
    try {
      const res = await fetch(`/api/polls/${slug}`);
      if (!res.ok) {
        alert('Không tìm thấy cuộc bình chọn.');
        window.location.hash = '';
        return;
      }
      const data = await res.json();
      renderPoll(data.poll, data.options);
    } catch (err) {
      console.error(err);
    }
  }

  function renderPoll(poll, options) {
    createSection.style.display = 'none';
    pollSection.style.display = 'block';

    pollTitle.textContent = poll.title;
    pollDesc.textContent = poll.description || '';
    if (poll.is_closed) {
      pollStatusBadge.textContent = 'Đã kết thúc';
      pollStatusBadge.className = 'badge closed';
    } else {
      pollStatusBadge.textContent = 'Đang mở';
      pollStatusBadge.className = 'badge open';
    }

    if (verifiedPin) {
      showActivePollInterface(poll, options);
    } else {
      pinGate.style.display = 'block';
      votingBox.style.display = 'none';
      resultsBox.style.display = 'none';
    }
  }

  verifyPinBtn.addEventListener('click', async () => {
    const pin = voterPinInput.value;
    if (!pin) {
      pinError.textContent = 'Vui lòng nhập mã PIN';
      return;
    }

    try {
      const res = await fetch(`/api/polls/${currentSlug}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        verifiedPin = pin;
        pinError.textContent = '';
        await loadPoll(currentSlug);
      } else {
        pinError.textContent = data.error || 'Mã PIN không chính xác';
      }
    } catch (err) {
      pinError.textContent = 'Lỗi kết nối';
    }
  });

  function showActivePollInterface(poll, options) {
    pinGate.style.display = 'none';

    if (poll.is_closed) {
      votingBox.style.display = 'none';
      renderResults(options);
      resultsBox.style.display = 'block';
      closePollBtn.style.display = 'none';
      return;
    }

    // Check local storage for vote status
    const hasVotedLocal = localStorage.getItem(`voted_${currentSlug}`);
    if (hasVotedLocal) {
      votingBox.style.display = 'none';
      renderResults(options);
      resultsBox.style.display = 'block';
    } else {
      voteOptionsList.innerHTML = '';
      options.forEach(opt => {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.marginBottom = '12px';
        label.style.cursor = 'pointer';
        label.innerHTML = `<input type="radio" name="vote_option" value="${opt.id}" required style="margin-right: 8px;"> ${opt.option_text}`;
        voteOptionsList.appendChild(label);
      });
      votingBox.style.display = 'block';
      renderResults(options);
      resultsBox.style.display = 'block';
    }
  }

  voteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selected = voteForm.querySelector('input[name="vote_option"]:checked');
    if (!selected) {
      alert('Vui lòng chọn một lựa chọn.');
      return;
    }

    try {
      const res = await fetch(`/api/polls/${currentSlug}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: selected.value, pin: verifiedPin })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem(`voted_${currentSlug}`, 'true');
        alert('Bỏ phiếu thành công!');
        await loadPoll(currentSlug);
      } else {
        alert(data.error || 'Lỗi khi bỏ phiếu');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  });

  function renderResults(options) {
    resultsChart.innerHTML = '';
    const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);

    options.forEach(opt => {
      const percent = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
      const item = document.createElement('div');
      item.className = 'chart-bar-item';
      item.innerHTML = `
        <div class="chart-label">
          <span>${opt.option_text}</span>
          <span>${opt.vote_count} phiếu (${percent}%)</span>
        </div>
        <div class="chart-bar-bg">
          <div class="chart-bar-fill" style="width: ${percent}%"></div>
        </div>
      `;
      resultsChart.appendChild(item);
    });
  }

  shareLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Đã sao chép liên kết vào bộ nhớ tạm!');
  });

  closePollBtn.addEventListener('click', async () => {
    if (!confirm('Bạn có chắc chắn muốn kết thúc cuộc bình chọn này?')) return;
    try {
      const res = await fetch(`/api/polls/${currentSlug}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: verifiedPin })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Đã kết thúc cuộc bình chọn.');
        await loadPoll(currentSlug);
      } else {
        alert(data.error || 'Lỗi');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  });

  newPollLink.addEventListener('click', (e) => {
    e.preventDefault();
    verifiedPin = null;
    window.location.hash = '';
    window.location.reload();
  });

  window.addEventListener('hashchange', checkRoute);
  checkRoute();
});
