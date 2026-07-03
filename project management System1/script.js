// ==================== DATA STORE ====================
const DB = {
    _key: (k) => `pmhub_${k}`,
    get(key) { return JSON.parse(localStorage.getItem(this._key(key)) || '[]'); },
    set(key, data) { localStorage.setItem(this._key(key), JSON.stringify(data)); },
    uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 6); }
};

let projects = DB.get('projects');
let tasks = DB.get('tasks');
let members = DB.get('members');
let activities = DB.get('activities');

function save() {
    DB.set('projects', projects);
    DB.set('tasks', tasks);
    DB.set('members', members);
    DB.set('activities', activities);
    updateStorage();
}

function log(type, msg) {
    activities.unshift({ id: DB.uid(), type, msg, time: new Date().toISOString() });
    if (activities.length > 100) activities = activities.slice(0, 100);
    save();
}

// ==================== TOAST ====================
function toast(msg, type = 'success') {
    const box = document.getElementById('toastBox');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(100%)'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ==================== MODAL ====================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-backdrop').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});

// ==================== NAVIGATION ====================
const menuItems = document.querySelectorAll('.menu-item');
const pages = document.querySelectorAll('.page');

menuItems.forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        const sec = item.dataset.section;
        menuItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        pages.forEach(p => p.classList.remove('active'));
        document.getElementById(sec).classList.add('active');
        document.getElementById('currentPage').textContent = item.querySelector('span').textContent;
        if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
        refreshAll();
    });
});

// Sidebar toggle
document.getElementById('sidebarToggle').addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    if (window.innerWidth <= 768) sb.classList.toggle('open');
    else sb.classList.toggle('collapsed');
});

// Close sidebar on outside click (mobile)
document.addEventListener('click', e => {
    const sb = document.getElementById('sidebar');
    if (window.innerWidth <= 768 && !sb.contains(e.target) && !document.getElementById('sidebarToggle').contains(e.target)) {
        sb.classList.remove('open');
    }
});

// Theme toggle
document.getElementById('themeToggle').addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    document.getElementById('themeToggle').querySelector('i').className = isDark ? 'fas fa-moon' : 'fas fa-sun';
    localStorage.setItem('pmhub_theme', isDark ? 'light' : 'dark');
});

// Load theme
if (localStorage.getItem('pmhub_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggle').querySelector('i').className = 'fas fa-sun';
}

// Keyboard shortcut Ctrl+K
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('globalSearch').focus(); }
});

// ==================== STORAGE INDICATOR ====================
function updateStorage() {
    let total = 0;
    for (let key in localStorage) {
        if (key.startsWith('pmhub_')) total += localStorage.getItem(key).length;
    }
    const percent = Math.min(Math.round((total / 5000000) * 100), 100);
    document.getElementById('storagePercent').textContent = percent + '%';
    document.getElementById('storageFill').style.width = percent + '%';
}

// ==================== UTILITY ====================
function fmtDate(d) {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return fmtDate(d);
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function avatarUrl(name, bg) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg || '6366f1'}&color=fff&size=64`;
}

const memberColors = ['6366f1', '22c55e', 'f59e0b', 'ef4444', '8b5cf6', '3b82f6', 'ec4899', '14b8a6'];

// ==================== PROJECTS ====================
document.getElementById('newProjectBtn').addEventListener('click', () => {
    document.getElementById('projectForm').reset();
    document.getElementById('pEditId').value = '';
    document.getElementById('pmTitle').textContent = 'Create New Project';
    renderMemberPicker();
    openModal('projectModal');
});

function renderMemberPicker(selected = []) {
    const el = document.getElementById('pMembers');
    if (members.length === 0) {
        el.innerHTML = '<p class="hint">Add team members first to assign them here.</p>';
        return;
    }
    el.innerHTML = members.map(m => `
        <label>
            <input type="checkbox" value="${m.id}" class="pm-check" ${selected.includes(m.id) ? 'checked' : ''}>
            ${m.name}
        </label>
    `).join('');
}

document.getElementById('projectForm').addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('pEditId').value;
    const checkedMembers = [...document.querySelectorAll('.pm-check:checked')].map(c => c.value);

    const data = {
        id: editId || DB.uid(),
        name: document.getElementById('pName').value.trim(),
        description: document.getElementById('pDesc').value.trim(),
        category: document.getElementById('pCategory').value,
        startDate: document.getElementById('pStart').value,
        endDate: document.getElementById('pEnd').value,
        status: document.getElementById('pStatus').value,
        priority: document.getElementById('pPriority').value,
        budget: document.getElementById('pBudget').value.trim(),
        client: document.getElementById('pClient').value.trim(),
        tech: document.getElementById('pTech').value.trim(),
        repo: document.getElementById('pRepo').value.trim(),
        notes: document.getElementById('pNotes').value.trim(),
        members: checkedMembers,
        createdAt: editId ? (projects.find(p => p.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (editId) {
        const idx = projects.findIndex(p => p.id === editId);
        projects[idx] = data;
        log('update', `Updated project "${data.name}"`);
        toast('Project updated successfully!');
    } else {
        projects.push(data);
        log('add', `Created new project "${data.name}"`);
        toast('Project created successfully! 🎉');
    }

    save();
    closeModal('projectModal');
    refreshAll();
});

function editProject(id) {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    document.getElementById('pmTitle').textContent = 'Edit Project';
    document.getElementById('pEditId').value = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pDesc').value = p.description || '';
    document.getElementById('pCategory').value = p.category || 'Web Development';
    document.getElementById('pStart').value = p.startDate;
    document.getElementById('pEnd').value = p.endDate;
    document.getElementById('pStatus').value = p.status;
    document.getElementById('pPriority').value = p.priority;
    document.getElementById('pBudget').value = p.budget || '';
    document.getElementById('pClient').value = p.client || '';
    document.getElementById('pTech').value = p.tech || '';
    document.getElementById('pRepo').value = p.repo || '';
    document.getElementById('pNotes').value = p.notes || '';
    renderMemberPicker(p.members || []);
    openModal('projectModal');
}

function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project? All related tasks will also be removed.')) return;
    const p = projects.find(x => x.id === id);
    projects = projects.filter(x => x.id !== id);
    tasks = tasks.filter(t => t.projectId !== id);
    log('delete', `Deleted project "${p?.name}"`);
    save();
    refreshAll();
    toast('Project deleted.', 'error');
}

function viewProject(id) {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    const pTasks = tasks.filter(t => t.projectId === id);
    const done = pTasks.filter(t => t.status === 'done').length;
    const progress = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;

    document.getElementById('detailTitle').textContent = p.name;
    document.getElementById('detailSub').textContent = p.category || '';

    const assignedMembers = (p.members || []).map(mid => members.find(m => m.id === mid)).filter(Boolean);

    document.getElementById('detailBody').innerHTML = `
        <div class="detail-grid">
            <div class="detail-item"><label>Status</label><span class="badge-pill ${p.status}">${p.status.replace('-', ' ').toUpperCase()}</span></div>
            <div class="detail-item"><label>Priority</label><span class="badge-pill ${p.priority}">${p.priority.toUpperCase()}</span></div>
            <div class="detail-item"><label>Start Date</label><span>${fmtDate(p.startDate)}</span></div>
            <div class="detail-item"><label>End Date</label><span>${fmtDate(p.endDate)}</span></div>
            <div class="detail-item"><label>Category</label><span>${p.category || 'N/A'}</span></div>
            <div class="detail-item"><label>Budget</label><span>${p.budget || 'N/A'}</span></div>
            <div class="detail-item"><label>Client</label><span>${p.client || 'N/A'}</span></div>
            <div class="detail-item"><label>Progress</label><span>${progress}% (${done}/${pTasks.length} tasks)</span></div>
            <div class="detail-item detail-full"><label>Description</label><span>${p.description || 'No description provided.'}</span></div>
            <div class="detail-item detail-full"><label>Technologies</label><span>${p.tech || 'N/A'}</span></div>
            ${p.repo ? `<div class="detail-item detail-full"><label>Repository</label><span><a href="${p.repo}" target="_blank" style="color:var(--primary)">${p.repo}</a></span></div>` : ''}
            ${p.notes ? `<div class="detail-item detail-full"><label>Notes</label><span>${p.notes}</span></div>` : ''}
        </div>

        <div class="detail-section">
            <h4>Team Members (${assignedMembers.length})</h4>
            ${assignedMembers.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:10px">
                ${assignedMembers.map((m, i) => `
                    <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bg-input);border-radius:var(--radius-full);font-size:12px">
                        <img src="${avatarUrl(m.name, memberColors[i % memberColors.length])}" width="24" height="24" style="border-radius:50%">
                        <span>${m.name}</span>
                        <span style="color:var(--text-muted)">${m.role}</span>
                    </div>
                `).join('')}
            </div>` : '<p class="hint">No members assigned.</p>'}
        </div>

        <div class="detail-section">
            <h4>Tasks (${pTasks.length})</h4>
            ${pTasks.length > 0 ? pTasks.map(t => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-light);font-size:13px">
                    <div style="display:flex;align-items:center;gap:8px">
                        <span class="status-dot ${t.status === 'done' ? 'done' : t.status === 'in-progress' ? 'progress' : t.status === 'review' ? 'review' : 'todo'}" style="width:8px;height:8px"></span>
                        <span style="${t.status === 'done' ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${t.title}</span>
                    </div>
                    <span class="badge-pill ${t.priority}" style="font-size:9px">${t.priority}</span>
                </div>
            `).join('') : '<p class="hint">No tasks for this project.</p>'}
        </div>
    `;

    openModal('detailModal');
}

function renderProjects(filter = 'all') {
    const container = document.getElementById('projectsContainer');
    let list = [...projects];
    const search = document.getElementById('globalSearch').value.toLowerCase();

    if (filter !== 'all') list = list.filter(p => p.status === filter);
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search) || (p.description || '').toLowerCase().includes(search) || (p.category || '').toLowerCase().includes(search));

    // Sort
    const sort = document.getElementById('sortProjects').value;
    if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'priority') {
        const ord = { critical: 0, high: 1, medium: 2, low: 3 };
        list.sort((a, b) => (ord[a.priority] || 2) - (ord[b.priority] || 2));
    }

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-folder-plus"></i><h3>No Projects Found</h3><p>Create your first project to get started.</p><button class="btn btn-primary" onclick="document.getElementById('newProjectBtn').click()"><i class="fas fa-plus"></i> Create Project</button></div>`;
        return;
    }

    container.innerHTML = list.map(p => {
        const pTasks = tasks.filter(t => t.projectId === p.id);
        const done = pTasks.filter(t => t.status === 'done').length;
        const progress = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
        const pMembers = (p.members || []).map(mid => members.find(m => m.id === mid)).filter(Boolean);

        return `
        <div class="project-card" onclick="viewProject('${p.id}')">
            <div class="card-accent ${p.status}"></div>
            <div class="pc-body">
                <div class="pc-top">
                    <h3>${p.name}</h3>
                    <div class="pc-actions" onclick="event.stopPropagation()">
                        <button onclick="editProject('${p.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                        <button class="del" onclick="deleteProject('${p.id}')" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <span class="pc-category">${p.category || 'General'}</span>
                <p class="pc-desc">${p.description || 'No description provided.'}</p>
                <div class="pc-badges">
                    <span class="badge-pill ${p.status}">${p.status.replace('-', ' ')}</span>
                    <span class="badge-pill ${p.priority}">${p.priority}</span>
                </div>
                <div class="pc-meta">
                    <span><i class="fas fa-calendar-alt"></i>${fmtDate(p.startDate)} — ${fmtDate(p.endDate)}</span>
                    ${p.client ? `<span><i class="fas fa-user-tie"></i>${p.client}</span>` : ''}
                </div>
                <div class="pc-progress">
                    <div class="pc-progress-head"><span>Completion</span><span>${progress}%</span></div>
                    <div class="progress-track"><div class="progress-fill blue" style="width:${progress}%"></div></div>
                </div>
                <div class="pc-footer">
                    <div class="pc-members">
                        ${pMembers.slice(0, 4).map((m, i) => `<div class="pc-member"><img src="${avatarUrl(m.name, memberColors[i % memberColors.length])}" alt="${m.name}"></div>`).join('')}
                        ${pMembers.length > 4 ? `<div class="pc-member" style="background:var(--border);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--text-secondary)">+${pMembers.length - 4}</div>` : ''}
                    </div>
                    <span class="pc-tasks-count"><i class="fas fa-clipboard-list"></i>${done}/${pTasks.length} tasks</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Filters
document.querySelectorAll('.chip[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.chip[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProjects(btn.dataset.filter);
    });
});

document.getElementById('sortProjects').addEventListener('change', () => {
    const activeFilter = document.querySelector('.chip[data-filter].active')?.dataset.filter || 'all';
    renderProjects(activeFilter);
});

// View toggle
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const container = document.getElementById('projectsContainer');
        container.className = `projects-container ${btn.dataset.view}-view`;
    });
});

// ==================== TASKS ====================
document.getElementById('newTaskBtn').addEventListener('click', () => {
    document.getElementById('taskForm').reset();
    document.getElementById('tEditId').value = '';
    document.getElementById('tmTitle').textContent = 'Create New Task';
    fillTaskDropdowns();
    openModal('taskModal');
});

function fillTaskDropdowns() {
    document.getElementById('tProject').innerHTML = '<option value="">-- Select Project --</option>' +
        projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    document.getElementById('tAssignee').innerHTML = '<option value="">-- Unassigned --</option>' +
        members.map(m => `<option value="${m.id}">${m.name} (${m.role})</option>`).join('');

    // Task project filter
    document.getElementById('taskProjectFilter').innerHTML = '<option value="all">All Projects</option>' +
        projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

document.getElementById('taskForm').addEventListener('submit', e => {
    e.preventDefault();
    const editId = document.getElementById('tEditId').value;

    const data = {
        id: editId || DB.uid(),
        title: document.getElementById('tTitle').value.trim(),
        description: document.getElementById('tDesc').value.trim(),
        projectId: document.getElementById('tProject').value,
        assigneeId: document.getElementById('tAssignee').value,
        priority: document.getElementById('tPriority').value,
        dueDate: document.getElementById('tDue').value,
        status: document.getElementById('tStatus').value,
        hours: document.getElementById('tHours').value,
        tags: document.getElementById('tTags').value.trim(),
        createdAt: editId ? (tasks.find(t => t.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (editId) {
        const idx = tasks.findIndex(t => t.id === editId);
        tasks[idx] = data;
        log('update', `Updated task "${data.title}"`);
        toast('Task updated successfully!');
    } else {
        tasks.push(data);
        log('add', `Created task "${data.title}"`);
        toast('Task created successfully! 🎉');
    }

    save();
    closeModal('taskModal');
    refreshAll();
});

function editTask(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    document.getElementById('tmTitle').textContent = 'Edit Task';
    fillTaskDropdowns();
    document.getElementById('tEditId').value = t.id;
    document.getElementById('tTitle').value = t.title;
    document.getElementById('tDesc').value = t.description || '';
    document.getElementById('tProject').value = t.projectId;
    document.getElementById('tAssignee').value = t.assigneeId || '';
    document.getElementById('tPriority').value = t.priority;
    document.getElementById('tDue').value = t.dueDate || '';
    document.getElementById('tStatus').value = t.status;
    document.getElementById('tHours').value = t.hours || '';
    document.getElementById('tTags').value = t.tags || '';
    openModal('taskModal');
}

function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    const t = tasks.find(x => x.id === id);
    tasks = tasks.filter(x => x.id !== id);
    log('delete', `Deleted task "${t?.title}"`);
    save();
    refreshAll();
    toast('Task deleted.', 'error');
}

function renderTasks() {
    const cols = { todo: 'colTodo', 'in-progress': 'colProgress', review: 'colReview', done: 'colDone' };
    Object.values(cols).forEach(id => document.getElementById(id).innerHTML = '');
    const counts = { todo: 0, 'in-progress': 0, review: 0, done: 0 };

    let list = [...tasks];
    const search = document.getElementById('globalSearch').value.toLowerCase();
    const projFilter = document.getElementById('taskProjectFilter')?.value || 'all';

    if (search) list = list.filter(t => t.title.toLowerCase().includes(search) || (t.description || '').toLowerCase().includes(search));
    if (projFilter !== 'all') list = list.filter(t => t.projectId === projFilter);

    list.forEach(t => {
        const colId = cols[t.status];
        if (!colId) return;
        counts[t.status]++;

        const proj = projects.find(p => p.id === t.projectId);
        const assignee = members.find(m => m.id === t.assigneeId);
        const tagsList = t.tags ? t.tags.split(',').map(x => x.trim()).filter(Boolean) : [];

        const card = document.createElement('div');
        card.className = `task-card ${t.priority}`;
        card.draggable = true;
        card.id = `task-${t.id}`;
        card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', t.id); card.classList.add('dragging'); });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));

        card.innerHTML = `
            <div class="tc-top">
                <h4>${t.title}</h4>
                <div class="tc-actions">
                    <button onclick="editTask('${t.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                    <button class="del" onclick="deleteTask('${t.id}')" title="Delete"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
            ${t.description ? `<p class="tc-desc">${t.description}</p>` : ''}
            ${tagsList.length > 0 ? `<div class="tc-tags">${tagsList.map(tag => `<span class="tc-tag">${tag}</span>`).join('')}</div>` : ''}
            <div class="tc-footer">
                <span class="tc-project">${proj?.name || 'Unknown'}</span>
                ${t.dueDate ? `<span class="tc-due"><i class="fas fa-clock"></i>${fmtDate(t.dueDate)}</span>` : ''}
                ${assignee ? `<div class="tc-assignee" title="${assignee.name}"><img src="${avatarUrl(assignee.name, '22c55e')}"></div>` : ''}
            </div>
        `;

        document.getElementById(colId).appendChild(card);
    });

    document.getElementById('cntTodo').textContent = counts.todo;
    document.getElementById('cntProgress').textContent = counts['in-progress'];
    document.getElementById('cntReview').textContent = counts.review;
    document.getElementById('cntDone').textContent = counts.done;
}

// Drag & Drop
function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
function handleDragLeave(e) { e.currentTarget.classList.remove('drag-over'); }
function handleDrop(e, status) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const t = tasks.find(x => x.id === id);
    if (t && t.status !== status) {
        const oldStatus = t.status;
        t.status = status;
        log('update', `Moved "${t.title}" from ${oldStatus} to ${status}`);
        save();
        refreshAll();
        toast(`Task moved to ${status.replace('-', ' ')}`, 'info');
    }
}

document.getElementById('taskProjectFilter')?.addEventListener('change', () => renderTasks());

// ==================== TEAM ====================
document.getElementById('newMemberBtn').addEventListener('click', () => {
    document.getElementById('memberForm').reset();
    openModal('memberModal');
});

document.getElementById('memberForm').addEventListener('submit', e => {
    e.preventDefault();
    const data = {
        id: DB.uid(),
        name: document.getElementById('mName').value.trim(),
        email: document.getElementById('mEmail').value.trim(),
        role: document.getElementById('mRole').value,
        department: document.getElementById('mDept').value,
        phone: document.getElementById('mPhone').value.trim(),
        createdAt: new Date().toISOString()
    };
    members.push(data);
    log('add', `Added team member "${data.name}"`);
    save();
    closeModal('memberModal');
    refreshAll();
    toast(`${data.name} added to the team! 👥`);
});

function deleteMember(id) {
    if (!confirm('Remove this team member?')) return;
    const m = members.find(x => x.id === id);
    members = members.filter(x => x.id !== id);
    log('delete', `Removed team member "${m?.name}"`);
    save();
    refreshAll();
    toast('Member removed.', 'error');
}

function renderTeam() {
    const container = document.getElementById('teamContainer');
    if (members.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-user-friends"></i><h3>No Team Members</h3><p>Add your first team member to get started.</p><button class="btn btn-primary" onclick="document.getElementById('newMemberBtn').click()"><i class="fas fa-user-plus"></i> Add Member</button></div>`;
        return;
    }
    container.innerHTML = members.map((m, i) => {
        const color = memberColors[i % memberColors.length];
        const mTasks = tasks.filter(t => t.assigneeId === m.id);
        const mDone = mTasks.filter(t => t.status === 'done').length;
        const mProjects = projects.filter(p => (p.members || []).includes(m.id));

        return `
        <div class="member-card">
            <button class="mc-delete" onclick="deleteMember('${m.id}')" title="Remove"><i class="fas fa-times"></i></button>
            <div class="mc-avatar"><img src="${avatarUrl(m.name, color)}"></div>
            <h3>${m.name}</h3>
            <p class="mc-email">${m.email}</p>
            <span class="mc-role">${m.role}</span>
            <p class="mc-dept">${m.department || 'Engineering'}</p>
            <div class="mc-stats">
                <div><h4>${mProjects.length}</h4><p>Projects</p></div>
                <div><h4>${mTasks.length}</h4><p>Tasks</p></div>
                <div><h4>${mDone}</h4><p>Completed</p></div>
            </div>
        </div>`;
    }).join('');
}

// ==================== DASHBOARD ====================
function renderDashboard() {
    document.getElementById('statProjects').textContent = projects.length;
    document.getElementById('statCompleted').textContent = tasks.filter(t => t.status === 'done').length;
    document.getElementById('statPending').textContent = tasks.filter(t => t.status !== 'done').length;
    document.getElementById('statMembers').textContent = members.length;

    // Project Progress
    const progEl = document.getElementById('dashProjectProgress');
    const filterVal = document.getElementById('progressFilter')?.value || 'all';
    let progProjects = filterVal === 'active' ? projects.filter(p => p.status === 'active') : projects;

    if (progProjects.length === 0) {
        progEl.innerHTML = '<div class="empty-state small"><i class="fas fa-chart-bar"></i><p>No projects yet.</p></div>';
    } else {
        progEl.innerHTML = progProjects.slice(0, 6).map(p => {
            const pTasks = tasks.filter(t => t.projectId === p.id);
            const done = pTasks.filter(t => t.status === 'done').length;
            const pct = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
            const color = pct >= 75 ? 'green' : pct >= 40 ? 'blue' : 'orange';
            return `<div class="progress-row">
                <div class="progress-info"><span>${p.name}</span><span>${pct}%</span></div>
                <div class="progress-track"><div class="progress-fill ${color}" style="width:${pct}%"></div></div>
            </div>`;
        }).join('');
    }

    document.getElementById('progressFilter')?.addEventListener('change', renderDashboard);

    // Task Donut
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const prog = tasks.filter(t => t.status === 'in-progress').length;
    const rev = tasks.filter(t => t.status === 'review').length;
    const done = tasks.filter(t => t.status === 'done').length;

    document.getElementById('donutTotal').textContent = total;

    const donut = document.getElementById('taskDonut');
    if (total > 0) {
        const p1 = (todo / total) * 100;
        const p2 = (prog / total) * 100;
        const p3 = (rev / total) * 100;
        const p4 = (done / total) * 100;
        donut.style.background = `conic-gradient(
            #3b82f6 0% ${p1}%,
            #f59e0b ${p1}% ${p1 + p2}%,
            #8b5cf6 ${p1 + p2}% ${p1 + p2 + p3}%,
            #22c55e ${p1 + p2 + p3}% 100%
        )`;
    } else {
        donut.style.background = 'var(--border-light)';
    }

    document.getElementById('donutLegend').innerHTML = [
        { label: 'To Do', count: todo, color: '#3b82f6' },
        { label: 'In Progress', count: prog, color: '#f59e0b' },
        { label: 'Review', count: rev, color: '#8b5cf6' },
        { label: 'Completed', count: done, color: '#22c55e' }
    ].map(item => `<div class="legend-item"><span class="legend-dot" style="background:${item.color}"></span>${item.label}: ${item.count}</div>`).join('');

    // Activity
    const actEl = document.getElementById('dashActivity');
    if (activities.length === 0) {
        actEl.innerHTML = '<div class="empty-state small"><i class="fas fa-history"></i><p>No recent activity.</p></div>';
    } else {
        const iconMap = { add: ['fa-plus', 'green'], update: ['fa-pen', 'blue'], delete: ['fa-trash', 'red'], complete: ['fa-check', 'purple'] };
        actEl.innerHTML = activities.slice(0, 15).map(a => {
            const [icon, color] = iconMap[a.type] || ['fa-info', 'blue'];
            return `<div class="activity-row"><div class="act-icon ${color}"><i class="fas ${icon}"></i></div><div class="act-text"><span>${a.msg}</span><div class="act-time">${timeAgo(a.time)}</div></div></div>`;
        }).join('');
    }

    // Deadlines
    const deadEl = document.getElementById('dashDeadlines');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const upcoming = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= today && t.status !== 'done')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 8);

    if (upcoming.length === 0) {
        deadEl.innerHTML = '<div class="empty-state small"><i class="fas fa-calendar-check"></i><p>No upcoming deadlines. 🎉</p></div>';
    } else {
        deadEl.innerHTML = upcoming.map(t => {
            const proj = projects.find(p => p.id === t.projectId);
            const days = Math.ceil((new Date(t.dueDate) - today) / 86400000);
            const cls = days <= 1 ? 'urgent' : days <= 3 ? 'soon' : 'normal';
            const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`;
            return `<div class="timeline-item"><div class="tl-date">${fmtDate(t.dueDate)}</div><div class="tl-info"><strong>${t.title}</strong><small>${proj?.name || 'Unknown'}</small></div><span class="tl-days ${cls}">${label}</span></div>`;
        }).join('');
    }

    // Notif dot
    document.getElementById('notifDot').style.display = upcoming.length > 0 ? 'block' : 'none';
}

// ==================== CALENDAR ====================
let calDate = new Date();

function renderCalendar() {
    const y = calDate.getFullYear(), m = calDate.getMonth();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calTitle').textContent = `${months[m]} ${y}`;

    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';

    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
        const el = document.createElement('div');
        el.className = 'cal-day-name';
        el.textContent = d;
        grid.appendChild(el);
    });

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = new Date();
    const eventDates = tasks.filter(t => t.dueDate).map(t => t.dueDate);

    for (let i = 0; i < firstDay; i++) {
        const el = document.createElement('div');
        el.className = 'cal-cell empty';
        el.textContent = ' ';
        grid.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const el = document.createElement('div');
        el.className = 'cal-cell';
        el.textContent = d;
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (today.getFullYear() === y && today.getMonth() === m && today.getDate() === d) el.classList.add('today');
        if (eventDates.includes(dateStr)) el.classList.add('has-event');
        grid.appendChild(el);
    }

    // Timeline
    const tlEl = document.getElementById('deadlineTimeline');
    const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
    const allDeadlines = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= todayDate && t.status !== 'done')
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (allDeadlines.length === 0) {
        tlEl.innerHTML = '<div class="empty-state small"><i class="fas fa-stream"></i><p>No deadlines scheduled.</p></div>';
    } else {
        tlEl.innerHTML = allDeadlines.map(t => {
            const proj = projects.find(p => p.id === t.projectId);
            const days = Math.ceil((new Date(t.dueDate) - todayDate) / 86400000);
            const cls = days <= 1 ? 'urgent' : days <= 7 ? 'soon' : 'normal';
            return `<div class="timeline-item"><div class="tl-date">${fmtDate(t.dueDate)}</div><div class="tl-info"><strong>${t.title}</strong><small>${proj?.name || ''} • ${t.priority} priority</small></div><span class="tl-days ${cls}">${days === 0 ? 'Today!' : days + ' days'}</span></div>`;
        }).join('');
    }
}

document.getElementById('calPrev').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); });
document.getElementById('calNext').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); });
document.getElementById('calToday').addEventListener('click', () => { calDate = new Date(); renderCalendar(); });

// ==================== REPORTS ====================
function renderReports() {
    // Project Summary
    const activeP = projects.filter(p => p.status === 'active').length;
    const holdP = projects.filter(p => p.status === 'on-hold').length;
    const compP = projects.filter(p => p.status === 'completed').length;
    document.getElementById('reportProjectSummary').innerHTML = `
        <div class="report-row"><span>Total Projects</span><span>${projects.length}</span></div>
        <div class="report-row"><span>Active</span><span style="color:var(--info)">${activeP}</span></div>
        <div class="report-row"><span>On Hold</span><span style="color:var(--warning)">${holdP}</span></div>
        <div class="report-row"><span>Completed</span><span style="color:var(--success)">${compP}</span></div>
    `;

    // Task Summary
    const todoT = tasks.filter(t => t.status === 'todo').length;
    const progT = tasks.filter(t => t.status === 'in-progress').length;
    const revT = tasks.filter(t => t.status === 'review').length;
    const doneT = tasks.filter(t => t.status === 'done').length;
    const totalHrs = tasks.reduce((s, t) => s + (parseInt(t.hours) || 0), 0);
    document.getElementById('reportTaskSummary').innerHTML = `
        <div class="report-row"><span>Total Tasks</span><span>${tasks.length}</span></div>
        <div class="report-row"><span>To Do</span><span>${todoT}</span></div>
        <div class="report-row"><span>In Progress</span><span>${progT}</span></div>
        <div class="report-row"><span>In Review</span><span>${revT}</span></div>
        <div class="report-row"><span>Completed</span><span style="color:var(--success)">${doneT}</span></div>
        <div class="report-row"><span>Total Est. Hours</span><span>${totalHrs}h</span></div>
    `;

    // Team Workload
    if (members.length === 0) {
        document.getElementById('reportTeamWorkload').innerHTML = '<p class="hint">No team members.</p>';
    } else {
        document.getElementById('reportTeamWorkload').innerHTML = members.map(m => {
            const ct = tasks.filter(t => t.assigneeId === m.id).length;
            return `<div class="report-row"><span>${m.name}</span><span>${ct} tasks</span></div>`;
        }).join('');
    }

    // Completion Overview
    const compEl = document.getElementById('reportCompletion');
    if (projects.length === 0) {
        compEl.innerHTML = '<div class="empty-state small"><i class="fas fa-chart-line"></i><p>Add projects to see overview.</p></div>';
    } else {
        compEl.innerHTML = projects.map(p => {
            const pTasks = tasks.filter(t => t.projectId === p.id);
            const done = pTasks.filter(t => t.status === 'done').length;
            const pct = pTasks.length > 0 ? Math.round((done / pTasks.length) * 100) : 0;
            const color = pct === 100 ? 'green' : pct >= 50 ? 'blue' : 'orange';
            return `<div class="progress-row" style="margin-bottom:16px">
                <div class="progress-info">
                    <span>${p.name} <span class="badge-pill ${p.status}" style="font-size:9px;margin-left:6px">${p.status}</span></span>
                    <span>${pct}% (${done}/${pTasks.length})</span>
                </div>
                <div class="progress-track"><div class="progress-fill ${color}" style="width:${pct}%"></div></div>
            </div>`;
        }).join('');
    }
}

// ==================== SEARCH ====================
document.getElementById('globalSearch').addEventListener('input', () => refreshAll());

// ==================== EXPORT ====================
function exportData() {
    const data = { projects, tasks, members, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projecthub-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Data exported successfully!', 'info');
}

function clearActivities() {
    if (!confirm('Clear all activity history?')) return;
    activities = [];
    save();
    refreshAll();
    toast('Activity history cleared.', 'info');
}

// ==================== REFRESH ====================
function refreshAll() {
    projects = DB.get('projects');
    tasks = DB.get('tasks');
    members = DB.get('members');
    activities = DB.get('activities');

    renderDashboard();
    renderProjects(document.querySelector('.chip[data-filter].active')?.dataset.filter || 'all');
    renderTasks();
    renderTeam();
    renderCalendar();
    renderReports();
    fillTaskDropdowns();
    updateStorage();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', refreshAll);

// Global access for inline handlers
window.editProject = editProject;
window.deleteProject = deleteProject;
window.viewProject = viewProject;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.deleteMember = deleteMember;
window.handleDragOver = handleDragOver;
window.handleDragLeave = handleDragLeave;
window.handleDrop = handleDrop;
window.closeModal = closeModal;
window.exportData = exportData;
window.clearActivities = clearActivities;