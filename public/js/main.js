// Person 1: Responsible for global front-end utilities and app bootstrap behavior.
document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-bs-theme', 'dark');

  // Real-time validation feedback for forms.
  document.querySelectorAll('form input, form select, form textarea').forEach((element) => {
    element.addEventListener('input', () => {
      if (!element.checkValidity()) {
        element.classList.add('is-invalid');
        element.classList.remove('is-valid');
      } else {
        element.classList.remove('is-invalid');
        element.classList.add('is-valid');
      }
    });
  });

  const params = new URLSearchParams(window.location.search);
  const successMessage = params.get('success');
  const errorMessage = params.get('error');
  if (successMessage) {
    showToast(successMessage, 'success');
  }
  if (errorMessage) {
    showToast(errorMessage, 'danger');
  }

  hydrateRecentNotifications();

  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.getAttribute('data-toggle-password');
      const target = document.getElementById(targetId);
      if (!target) return;
      const hidden = target.type === 'password';
      target.type = hidden ? 'text' : 'password';
      button.textContent = hidden ? 'Hide' : 'Show';
    });
  });

  const confirmPassword = document.getElementById('confirmPassword');
  if (confirmPassword) {
    confirmPassword.addEventListener('input', () => {
      const sourceId = confirmPassword.getAttribute('data-match');
      const source = sourceId ? document.getElementById(sourceId) : null;
      if (!source) return;
      if (confirmPassword.value !== source.value) {
        confirmPassword.setCustomValidity('Passwords do not match');
      } else {
        confirmPassword.setCustomValidity('');
      }
    });
  }
});

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  return response.json();
}

window.AppHelpers = {
  apiRequest,
  showToast
};

async function hydrateRecentNotifications() {
  const dropdown = document.getElementById('notificationDropdownList');
  const count = document.getElementById('notificationCount');
  if (!dropdown || !count) {
    return;
  }

  try {
    const response = await fetch('/notifications/recent', { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const notifications = payload.success ? payload.data || [] : [];
    count.textContent = String(notifications.length);

    const items = notifications
      .slice(0, 5)
      .map((item) => {
        return `<li><span class="dropdown-item-text"><strong>${item.title}</strong><br /><small class="text-muted">${item.message}</small></span></li>`;
      })
      .join('');

    dropdown.innerHTML = notifications.length
      ? `${items}<li><hr class="dropdown-divider" /></li><li><a class="dropdown-item" href="/notifications">View All</a></li>`
      : '<li><span class="dropdown-item-text text-muted">No recent notifications</span></li><li><hr class="dropdown-divider" /></li><li><a class="dropdown-item" href="/notifications">View All</a></li>';
  } catch (error) {
    // Ignore navbar notification fetch failures.
  }
}

function showToast(message, level = 'info') {
  const containerId = 'globalToastContainer';
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '1080';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${level} border-0`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 3500 });
  bsToast.show();

  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}