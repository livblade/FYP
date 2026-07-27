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

    dropdown.replaceChildren();

    if (notifications.length) {
      notifications.slice(0, 5).forEach((item) => {
        const row = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'dropdown-item';
        link.href = item.href || '/notifications';

        const title = document.createElement('strong');
        title.textContent = item.title || 'Notification';

        const message = document.createElement('small');
        message.className = 'text-muted d-block';
        message.textContent = item.message || '';

        link.append(title, message);
        row.appendChild(link);
        dropdown.appendChild(row);
      });
    } else {
      const row = document.createElement('li');
      const empty = document.createElement('span');
      empty.className = 'dropdown-item-text text-muted';
      empty.textContent = 'No recent notifications';
      row.appendChild(empty);
      dropdown.appendChild(row);
    }

    const dividerRow = document.createElement('li');
    const divider = document.createElement('hr');
    divider.className = 'dropdown-divider';
    dividerRow.appendChild(divider);

    const viewAllRow = document.createElement('li');
    const viewAllLink = document.createElement('a');
    viewAllLink.className = 'dropdown-item';
    viewAllLink.href = '/notifications';
    viewAllLink.textContent = 'View All';
    viewAllRow.appendChild(viewAllLink);

    dropdown.append(dividerRow, viewAllRow);
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
