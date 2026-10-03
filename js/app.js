/**
 * KAVACH CAMPUS — App Core Module
 * Toast notifications, animations, routing guard, utility functions
 */

const App = {
  // ── Toast Notifications ──
  toast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span style="color:var(--${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'})">${icons[type] || icons.info}</span>
      <div style="flex:1">
        <p style="font-size:var(--text-sm);font-weight:var(--font-medium)">${message}</p>
      </div>
      <button onclick="this.parentElement.remove()" style="color:var(--text-tertiary);background:none;border:none;cursor:pointer;padding:4px">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // ── Loading State ──
  showLoading(element, text = 'Loading...') {
    if (typeof element === 'string') element = document.getElementById(element);
    if (!element) return;
    element.dataset.originalContent = element.innerHTML;
    element.classList.add('btn-loading');
    element.disabled = true;
    const btnText = element.querySelector('.btn-text');
    if (btnText) btnText.textContent = text;
  },

  hideLoading(element) {
    if (typeof element === 'string') element = document.getElementById(element);
    if (!element) return;
    element.classList.remove('btn-loading');
    element.disabled = false;
    if (element.dataset.originalContent) {
      element.innerHTML = element.dataset.originalContent;
    }
  },

  // ── Auth Guard ──
  requireAuth(allowedRoles = null) {
    if (!API.isLoggedIn()) {
      window.location.href = '/pages/login.html';
      return false;
    }
    if (allowedRoles) {
      const user = API.getUser();
      if (!user || !allowedRoles.includes(user.role)) {
        window.location.href = '/pages/login.html?unauthorized=1';
        return false;
      }
    }
    return true;
  },

  // ── Role Checking ──
  isStudent() {
    const user = API.getUser();
    return user && user.role === 'STUDENT';
  },

  isStaff() {
    const user = API.getUser();
    if (!user) return false;
    return ['STAFF','MENTOR','COUNSELOR','HOD','SECURITY','WOMENS_CELL','PRINCIPAL','ADMIN','SUPER_ADMIN'].includes(user.role);
  },

  isAdmin() {
    const user = API.getUser();
    return user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  },

  // ── Scroll Reveal ──
  initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  },

  // ── Counter Animation ──
  animateCounter(element, target, duration = 1500) {
    if (typeof element === 'string') element = document.getElementById(element);
    if (!element) return;
    let start = 0;
    const startTime = performance.now();
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  },

  // ── Ripple Effect ──
  addRipple(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'btn-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  },

  // ── Sidebar Toggle (Mobile) ──
  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  },

  // ── Format Date ──
  formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  },

  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  formatRelative(dateStr) {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return App.formatDate(dateStr);
  },

  // ── Severity Badge ──
  severityBadge(level) {
    const labels = { L1: 'Low', L2: 'Moderate', L3: 'High', L4: 'Critical' };
    return `<span class="badge badge-${level.toLowerCase()}">${level} — ${labels[level] || level}</span>`;
  },

  // ── Status Badge ──
  statusBadge(status) {
    const colors = {
      OPEN: 'info', ACKNOWLEDGED: 'primary', ASSIGNED: 'primary',
      IN_PROGRESS: 'warning', ESCALATED: 'danger', RESOLVED: 'success', CLOSED: 'success'
    };
    return `<span class="badge badge-${colors[status] || 'info'}">${status.replace('_', ' ')}</span>`;
  },

  // ── Greeting ──
  getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  },

  // ── Escape HTML ──
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ── Debounce ──
  debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // ── Initialize page ──
  init() {
    // Ripple effects on buttons
    document.querySelectorAll('.btn-primary, .btn-danger').forEach(btn => {
      btn.addEventListener('click', App.addRipple);
    });

    // Scroll reveal
    this.initScrollReveal();

    // Mobile sidebar overlay
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.toggleSidebar());
    }

    // Session expired check
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') {
      this.toast('Your session has expired. Please log in again.', 'warning');
    }
    if (params.get('unauthorized') === '1') {
      this.toast('You do not have permission to access that page.', 'error');
    }
  }
};

window.App = App;

// Auto-init on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
