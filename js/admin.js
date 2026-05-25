/* ============================================================
   ASHOKA WATER PARK & RESORT — Admin Dashboard JS
   Login, Dashboard tabs, CRUD operations, Gallery management
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const loginSection = document.getElementById('admin-login-section');
  const dashboard = document.getElementById('admin-dashboard');
  const loginForm = document.getElementById('admin-login-form');

  // ---------- Auth Check ----------
  function checkAuth() {
    if (window.ashokaDB && window.ashokaDB.isLoggedIn()) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  function showLogin() {
    if (loginSection) loginSection.style.display = '';
    if (dashboard) dashboard.style.display = 'none';
  }

  function showDashboard() {
    if (loginSection) loginSection.style.display = 'none';
    if (dashboard) dashboard.style.display = 'grid';
    loadDashboardData();
  }

  // ---------- Login ----------
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.querySelector('#admin-email')?.value?.trim();
      const password = loginForm.querySelector('#admin-password')?.value;

      if (!email || !password) {
        window.showToast?.('Please enter email and password.', 'error');
        return;
      }

      const btn = loginForm.querySelector('.btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Signing in...';
      }

      try {
        const result = await window.ashokaDB.login(email, password);
        if (result.success) {
          window.showToast?.('Welcome to the Admin Dashboard!', 'success');
          showDashboard();
        } else {
          window.showToast?.(result.error || 'Invalid credentials', 'error');
        }
      } catch (err) {
        window.showToast?.('Login failed. Please try again.', 'error');
      }

      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sign In';
      }
    });
  }

  // ---------- Logout ----------
  const logoutBtn = document.getElementById('admin-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await window.ashokaDB?.logout();
      window.showToast?.('Logged out successfully.', 'info');
      showLogin();
    });
  }

  // ---------- Sidebar Navigation ----------
  const navItems = document.querySelectorAll('.admin-nav-item[data-panel]');
  const panels = document.querySelectorAll('[id^="panel-"]');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPanel = item.getAttribute('data-panel');

      // Update active nav
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Show target panel
      panels.forEach(panel => {
        panel.style.display = panel.id === `panel-${targetPanel}` ? '' : 'none';
      });

      // Update header
      const header = document.querySelector('.admin-header h1');
      const titles = {
        'dashboard': 'Dashboard Overview',
        'inquiries': 'Booking Inquiries',
        'testimonials': 'Guest Testimonials',
        'gallery': 'Gallery Management',
        'settings': 'Resort Settings'
      };
      if (header) header.textContent = titles[targetPanel] || 'Dashboard';
    });
  });

  // ---------- Load Dashboard Data ----------
  async function loadDashboardData() {
    if (!window.ashokaDB) return;

    try {
      // Stats
      const totalInquiries = await window.ashokaDB.count('inquiries');
      const pendingReviews = await window.ashokaDB.countWhere('testimonials', 'status', 'pending');
      const galleryCount = await window.ashokaDB.count('gallery');

      // Get current month inquiries
      const allInquiries = await window.ashokaDB.getAll('inquiries');
      const now = new Date();
      const monthlyInquiries = allInquiries.filter(inq => {
        const d = new Date(inq.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;

      // Update stat cards
      updateStat('stat-inquiries', totalInquiries);
      updateStat('stat-monthly', monthlyInquiries);
      updateStat('stat-reviews', pendingReviews);
      updateStat('stat-gallery', galleryCount);

      // Load tables
      loadInquiriesTable(allInquiries);
      loadTestimonialsTable();
      loadGalleryGrid();
    } catch (err) {
      console.error('Dashboard data load error:', err);
    }
  }

  function updateStat(id, value) {
    const el = document.getElementById(id);
    if (el) {
      const valEl = el.querySelector('.stat-value');
      if (valEl) valEl.textContent = value;
    }
  }

  // ---------- Inquiries Table ----------
  async function loadInquiriesTable(inquiries) {
    const tbody = document.getElementById('inquiries-table-body');
    if (!tbody) return;

    if (!inquiries) {
      inquiries = await window.ashokaDB?.getAll('inquiries') || [];
    }

    if (inquiries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--gray-400);">No inquiries yet. They will appear here when visitors submit the contact form.</td></tr>`;
      return;
    }

    tbody.innerHTML = inquiries.map(inq => `
      <tr>
        <td><strong>${escapeHtml(inq.name || 'N/A')}</strong></td>
        <td>${escapeHtml(inq.phone || 'N/A')}</td>
        <td>${escapeHtml(inq.type || 'General')}</td>
        <td>${formatDate(inq.createdAt)}</td>
        <td><span class="admin-badge admin-badge-${inq.status === 'read' ? 'read' : 'new'}">${inq.status === 'read' ? 'Read' : 'New'}</span></td>
        <td>
          <div style="display:flex;gap:8px;">
            ${inq.status !== 'read' ? `<button class="btn btn-sm btn-ocean" onclick="markInquiryRead('${inq.id}')">Mark Read</button>` : ''}
            <button class="btn btn-sm btn-outline" onclick="deleteInquiry('${inq.id}')" style="color:#ef4444;border-color:#ef4444;">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  window.markInquiryRead = async function (id) {
    await window.ashokaDB?.update('inquiries', id, { status: 'read' });
    window.showToast?.('Inquiry marked as read', 'success');
    loadDashboardData();
  };

  window.deleteInquiry = async function (id) {
    if (!confirm('Are you sure you want to delete this inquiry?')) return;
    await window.ashokaDB?.delete('inquiries', id);
    window.showToast?.('Inquiry deleted', 'info');
    loadDashboardData();
  };

  // ---------- Testimonials ----------
  async function loadTestimonialsTable() {
    const tbody = document.getElementById('testimonials-table-body');
    if (!tbody) return;

    const testimonials = await window.ashokaDB?.getAll('testimonials') || [];

    if (testimonials.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--gray-400);">No testimonials yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = testimonials.map(t => `
      <tr>
        <td><strong>${escapeHtml(t.name || 'N/A')}</strong></td>
        <td>${'★'.repeat(t.rating || 5)}${'☆'.repeat(5 - (t.rating || 5))}</td>
        <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(t.review || '')}</td>
        <td><span class="admin-badge admin-badge-${t.status === 'approved' ? 'read' : 'pending'}">${t.status === 'approved' ? 'Approved' : 'Pending'}</span></td>
        <td>
          <div style="display:flex;gap:8px;">
            ${t.status !== 'approved' ? `<button class="btn btn-sm btn-ocean" onclick="approveTestimonial('${t.id}')">Approve</button>` : ''}
            <button class="btn btn-sm btn-outline" onclick="deleteTestimonial('${t.id}')" style="color:#ef4444;border-color:#ef4444;">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  window.approveTestimonial = async function (id) {
    await window.ashokaDB?.update('testimonials', id, { status: 'approved' });
    window.showToast?.('Testimonial approved!', 'success');
    loadDashboardData();
  };

  window.deleteTestimonial = async function (id) {
    if (!confirm('Delete this testimonial?')) return;
    await window.ashokaDB?.delete('testimonials', id);
    window.showToast?.('Testimonial deleted', 'info');
    loadDashboardData();
  };

  // Add Testimonial Modal
  const addTestimonialBtn = document.getElementById('add-testimonial-btn');
  const testimonialModal = document.getElementById('testimonial-modal');
  const testimonialForm = document.getElementById('testimonial-form');

  if (addTestimonialBtn && testimonialModal) {
    addTestimonialBtn.addEventListener('click', () => {
      testimonialModal.classList.add('open');
    });

    testimonialModal.querySelector('.modal-close')?.addEventListener('click', () => {
      testimonialModal.classList.remove('open');
    });

    testimonialModal.addEventListener('click', (e) => {
      if (e.target === testimonialModal) testimonialModal.classList.remove('open');
    });
  }

  if (testimonialForm) {
    testimonialForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name: testimonialForm.querySelector('#testimonial-name')?.value?.trim() || '',
        rating: parseInt(testimonialForm.querySelector('#testimonial-rating')?.value) || 5,
        review: testimonialForm.querySelector('#testimonial-review')?.value?.trim() || '',
        status: 'approved'
      };

      if (!data.name || !data.review) {
        window.showToast?.('Please fill in all fields.', 'error');
        return;
      }

      await window.ashokaDB?.add('testimonials', data);
      window.showToast?.('Testimonial added successfully!', 'success');
      testimonialModal?.classList.remove('open');
      testimonialForm.reset();
      loadDashboardData();
    });
  }

  // ---------- Gallery Management ----------
  async function loadGalleryGrid() {
    const grid = document.getElementById('admin-gallery-grid');
    if (!grid) return;

    const images = await window.ashokaDB?.getAll('gallery') || [];

    if (images.length === 0) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray-400);">No gallery images uploaded yet.</p>`;
      return;
    }

    grid.innerHTML = images.map(img => `
      <div class="admin-gallery-item">
        ${img.url ? `<img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.caption || '')}" loading="lazy">` : `<div class="img-placeholder">${escapeHtml(img.caption || 'Image')}</div>`}
        <div class="item-actions">
          <button onclick="deleteGalleryImage('${img.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
    `).join('');

    // Re-init Lucide icons
    if (window.lucide) window.lucide.createIcons();
  }

  window.deleteGalleryImage = async function (id) {
    if (!confirm('Delete this image?')) return;
    await window.ashokaDB?.delete('gallery', id);
    window.showToast?.('Image deleted', 'info');
    loadDashboardData();
  };

  // Upload zone
  const uploadZone = document.getElementById('gallery-upload-zone');
  const fileInput = document.getElementById('gallery-file-input');

  if (uploadZone && fileInput) {
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
      handleFiles(fileInput.files);
    });
  }

  async function handleFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      // Convert to base64 for localStorage storage
      const reader = new FileReader();
      reader.onload = async (e) => {
        await window.ashokaDB?.add('gallery', {
          url: e.target.result,
          caption: file.name,
          category: 'general'
        });
        window.showToast?.(`Uploaded: ${file.name}`, 'success');
        loadDashboardData();
      };
      reader.readAsDataURL(file);
    }
  }

  // ---------- Settings ----------
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    // Load existing settings
    const settings = JSON.parse(localStorage.getItem('ashoka_settings') || '{}');
    settingsForm.querySelector('#setting-name')?.setAttribute('value', settings.name || 'Ashoka Water Park & Resort');
    settingsForm.querySelector('#setting-phone')?.setAttribute('value', settings.phone || '+91 9619900019');
    settingsForm.querySelector('#setting-email')?.setAttribute('value', settings.email || 'info@ashokaresort.com');
    settingsForm.querySelector('#setting-whatsapp')?.setAttribute('value', settings.whatsapp || '919619900019');
    if (settingsForm.querySelector('#setting-address')) {
      settingsForm.querySelector('#setting-address').value = settings.address || 'Ashoka Water Park & Resort, At Post Harnai, Near Vakdi Bhend Road, Harnai, Dapoli, Maharashtra 415713';
    }

    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newSettings = {
        name: settingsForm.querySelector('#setting-name')?.value || '',
        phone: settingsForm.querySelector('#setting-phone')?.value || '',
        email: settingsForm.querySelector('#setting-email')?.value || '',
        whatsapp: settingsForm.querySelector('#setting-whatsapp')?.value || '',
        address: settingsForm.querySelector('#setting-address')?.value || ''
      };
      localStorage.setItem('ashoka_settings', JSON.stringify(newSettings));
      window.showToast?.('Settings saved successfully!', 'success');
    });
  }

  // ---------- Refresh Button ----------
  const refreshBtn = document.querySelector('.admin-header .btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadDashboardData();
      window.showToast?.('Dashboard refreshed', 'info');
    });
  }

  // ---------- Helpers ----------
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  // ---------- Init ----------
  checkAuth();

});
