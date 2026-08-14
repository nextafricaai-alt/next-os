// ============================================================
// CharisOS Cloud — Supabase Integration Layer
// Charis Creations Limited
//
// SETUP: Replace the two constants below with your actual
//        Supabase project URL and anon key from:
//        Supabase Dashboard → Settings → API
// ============================================================

var SUPABASE_URL  = 'https://vlmcwmjhmenbnymwfkdk.supabase.co';
var SUPABASE_ANON = 'sb_publishable_Q7wTRJK-hCy87Tfy7ROkeA_94Q9HQQw';

// ── CLIENT INIT ───────────────────────────────────────────────
// Explicit auth config for PWA persistence — prevents iOS Safari
// from losing the session when the app is backgrounded or reopened.
var SUPA = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,          // keep JWT in localStorage across app restarts
    autoRefreshToken: true,        // silently refresh before expiry (default 1hr)
    detectSessionInUrl: false,     // we don't use OAuth redirects — skip URL parsing
    storageKey: 'charisOS_auth',   // dedicated key so other apps don't clash
    storage: window.localStorage   // explicit — ensures iOS PWA uses localStorage
  }
});

// ─────────────────────────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────────────────────────
var db = {

  // ── Authentication ────────────────────────────────────────
  signIn: async function(email, password) {
    return SUPA.auth.signInWithPassword({ email: email, password: password });
  },

  signOut: async function() {
    return SUPA.auth.signOut();
  },

  getSession: async function() {
    return SUPA.auth.getSession();
  },

  getProfile: async function(userId) {
    var { data, error } = await SUPA.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  },

  getAllProfiles: async function() {
    var { data, error } = await SUPA.from('profiles').select('id, name, app_role, color');
    if (error) { console.error('getAllProfiles:', error); return []; }
    return data || [];
  },

  updateProfile: async function(userId, updates) {
    return SUPA.from('profiles').update(updates).eq('id', userId);
  },

  // ── TEAM ──────────────────────────────────────────────────
  // Returns data shaped to match the existing TEAM array items
  getTeam: async function() {
    var { data, error } = await SUPA.from('team').select('*').order('id');
    if (error) { console.error('getTeam:', error); return []; }
    return (data || []).map(db._toTeam);
  },

  saveTeamMember: async function(member) {
    var row = db._fromTeam(member);
    if (member.id && member.id > 0 && !member._new) {
      var { error } = await SUPA.from('team').update(row).eq('id', member.id);
      if (error) throw error;
    } else {
      var { data, error } = await SUPA.from('team').insert(row).select().single();
      if (error) throw error;
      return db._toTeam(data);
    }
    return member;
  },

  deleteTeamMember: async function(id) {
    return SUPA.from('team').delete().eq('id', id);
  },

  _toTeam: function(row) {
    return {
      id:           row.id,
      name:         row.name || '',
      role:         row.role || '',
      phone:        row.phone || '',
      email:        row.email || '',
      color:        row.color || '#3b82f6',
      skills:       row.skills || [],
      rateWedding:  row.rate_wedding || 0,
      rateStandard: row.rate_standard || 0,
      rateSmall:    row.rate_small || 0,
      availability: row.availability || 'Available',
      notes:        row.notes || '',
      joinDate:     row.join_date || ''
    };
  },

  _fromTeam: function(m) {
    return {
      name:          m.name,
      role:          m.role || '',
      phone:         m.phone || '',
      email:         m.email || '',
      color:         m.color || '#3b82f6',
      skills:        m.skills || [],
      rate_wedding:  m.rateWedding || 0,
      rate_standard: m.rateStandard || 0,
      rate_small:    m.rateSmall || 0,
      availability:  m.availability || 'Available',
      notes:         m.notes || '',
      join_date:     m.joinDate || ''
    };
  },

  // ── CLIENTS ───────────────────────────────────────────────
  getClients: async function() {
    var { data, error } = await SUPA.from('clients').select('*').order('name');
    if (error) { console.error('getClients:', error); return []; }
    return data || [];
  },

  saveClient: async function(client) {
    var row = { name:client.name, type:client.type||'Individual', phone:client.phone||'',
                email:client.email||'', location:client.location||'', color:client.color||'#3b82f6', notes:client.notes||'' };
    if (client.id && !client._new) {
      var { error } = await SUPA.from('clients').update(row).eq('id', client.id);
      if (error) throw error;
    } else {
      var { data, error } = await SUPA.from('clients').insert(row).select().single();
      if (error) throw error;
      return data;
    }
    return client;
  },

  deleteClient: async function(id) {
    return SUPA.from('clients').delete().eq('id', id);
  },

  // ── PROJECTS ──────────────────────────────────────────────
  getProjects: async function() {
    var { data, error } = await SUPA.from('projects').select('*').order('id', { ascending: false });
    if (error) { console.error('getProjects:', error); return []; }
    return (data || []).map(db._toProject);
  },

  saveProject: async function(project) {
    var row = db._fromProject(project);
    if (project.id && !project._new) {
      var { error } = await SUPA.from('projects').update(row).eq('id', project.id);
      if (error) throw error;
    } else {
      var { data, error } = await SUPA.from('projects').insert(row).select().single();
      if (error) throw error;
      return db._toProject(data);
    }
    return project;
  },

  deleteProject: async function(id) {
    return SUPA.from('projects').delete().eq('id', id);
  },

  _toProject: function(row) {
    return {
      id:                row.id,
      ref:               row.ref,
      client:            row.client,
      phone:             row.phone || '',
      email:             row.email || '',
      eventType:         row.event_type || '',
      pkg:               row.pkg || '',
      date:              row.date || '',
      deadline:          row.deadline || '',
      location:          row.location || '',
      budget:            row.budget || 0,
      deposit:           row.deposit || 0,
      status:            row.status || 'Inquiry',
      team:              row.team || [],
      equipment:         row.equipment || [],
      workflowChecklist: row.workflow_checklist || [],
      notes:             row.notes || ''
    };
  },

  _fromProject: function(p) {
    return {
      ref:               p.ref,
      client:            p.client,
      phone:             p.phone || '',
      email:             p.email || '',
      event_type:        p.eventType || '',
      pkg:               p.pkg || '',
      date:              p.date || '',
      deadline:          p.deadline || '',
      location:          p.location || '',
      budget:            p.budget || 0,
      deposit:           p.deposit || 0,
      status:            p.status || 'Inquiry',
      team:              p.team || [],
      equipment:         p.equipment || [],
      workflow_checklist: p.workflowChecklist || [],
      notes:             p.notes || ''
    };
  },

  // ── TASKS ─────────────────────────────────────────────────
  getTasks: async function(userId, userRole, userName) {
    var isAdmin = (userRole === 'Admin' || userRole === 'Accountant');
    if (isAdmin || !userId) {
      // Admin / Accountant see all tasks
      var { data, error } = await SUPA.from('tasks').select('*').order('id');
      if (error) { console.error('getTasks:', error); return []; }
      return (data || []).map(db._toTask);
    }
    // Staff: fetch by assigned_user_id (UUID)  ∪  assign_to (name string, for legacy tasks)
    var results = {};
    var { data: d1, error: e1 } = await SUPA.from('tasks').select('*').eq('assigned_user_id', userId);
    if (!e1 && d1) { d1.forEach(function(r){ results[r.id] = r; }); }
    if (userName) {
      var { data: d2, error: e2 } = await SUPA.from('tasks').select('*').ilike('assign_to', userName);
      if (!e2 && d2) { d2.forEach(function(r){ results[r.id] = r; }); }
    }
    return Object.values(results).map(db._toTask).sort(function(a,b){ return a.id - b.id; });
  },

  saveTask: async function(task) {
    var row = db._fromTask(task);
    if (task.id && !task._new) {
      var { error } = await SUPA.from('tasks').update(row).eq('id', task.id);
      if (error) throw error;
    } else {
      var { data, error } = await SUPA.from('tasks').insert(row).select().single();
      if (error) throw error;
      return db._toTask(data);
    }
    return task;
  },

  saveAllTasksForProject: async function(tasks) {
    if (!tasks || !tasks.length) return [];
    // INSERT only — let Supabase assign IDs (avoids upsert conflict on null id)
    var rows = tasks.map(function(t) {
      return {
        project_id:       t.projId || null,
        proj_ref:         t.projRef || '',
        label:            t.label,
        assign_to:        t.assignTo || '',
        assigned_user_id: t.assignedUserId || null,
        step_id:          t.stepId || 0,
        status:           t.status || 'Pending',
        notes:            t.notes || ''
      };
    });
    var { data, error } = await SUPA.from('tasks').insert(rows).select();
    if (error) throw error;
    return (data || []).map(db._toTask);
  },

  deleteTasksByProject: async function(projectId) {
    return SUPA.from('tasks').delete().eq('project_id', projectId);
  },

  _toTask: function(row) {
    return {
      id:             row.id,
      projId:         row.project_id,
      projRef:        row.proj_ref || '',
      label:          row.label,
      assignTo:       row.assign_to || '',
      assignedUserId: row.assigned_user_id || null,
      stepId:         row.step_id || 0,
      status:         row.status || 'Pending',
      notes:          row.notes || '',
      created:        row.created_at || ''
    };
  },

  _fromTask: function(t) {
    return {
      id:               t.id && !t._new ? t.id : undefined,
      project_id:       t.projId || null,
      proj_ref:         t.projRef || '',
      label:            t.label,
      assign_to:        t.assignTo || '',
      assigned_user_id: t.assignedUserId || null,
      step_id:          t.stepId || 0,
      status:           t.status || 'Pending',
      notes:            t.notes || ''
    };
  },

  // ── ATTENDANCE ────────────────────────────────────────────
  getAttendance: async function() {
    var { data, error } = await SUPA.from('attendance').select('*').order('date', { ascending: false });
    if (error) { console.error('getAttendance:', error); return []; }
    return (data || []).map(db._toAttendance);
  },

  saveAttendanceRecord: async function(record) {
    var row = db._fromAttendance(record);
    if (record.id && !record._new) {
      var { error } = await SUPA.from('attendance').update(row).eq('id', record.id);
      if (error) throw error;
    } else {
      var { data, error } = await SUPA.from('attendance').insert(row).select().single();
      if (error) throw error;
      return db._toAttendance(data);
    }
    return record;
  },

  _toAttendance: function(row) {
    return {
      id:         row.id,
      memberId:   row.member_id,
      memberName: row.member_name || '',
      userId:     row.user_id || null,
      date:       row.date,
      checkIn:    row.check_in || '',
      checkOut:   row.check_out || '',
      workType:   row.work_type || 'Office',
      notes:      row.notes || ''
    };
  },

  _fromAttendance: function(r) {
    return {
      id:          r.id && !r._new ? r.id : undefined,
      member_id:   r.memberId || null,
      member_name: r.memberName || '',
      user_id:     r.userId || null,
      date:        r.date,
      check_in:    r.checkIn || '',
      check_out:   r.checkOut || '',
      work_type:   r.workType || 'Office',
      notes:       r.notes || ''
    };
  },

  // ── NOTIFICATIONS ─────────────────────────────────────────
  getNotifications: async function(userId) {
    var query = SUPA.from('notifications').select('*').order('ts', { ascending: false }).limit(50);
    // If admin, get all; otherwise own
    if (userId) {
      query = query.or('user_id.eq.'+userId+',user_id.is.null');
    }
    var { data, error } = await query;
    if (error) { console.error('getNotifications:', error); return []; }
    return (data || []).map(db._toNotif);
  },

  insertNotification: async function(notif) {
    var row = {
      type:     notif.type || '',
      title:    notif.title,
      body:     notif.body || '',
      proj_ref: notif.projRef || '',
      user_id:  notif.userId || null,
      read:     false
    };
    var { data, error } = await SUPA.from('notifications').insert(row).select().single();
    if (error) throw error;
    return db._toNotif(data);
  },

  markNotificationRead: async function(id) {
    return SUPA.from('notifications').update({ read: true }).eq('id', id);
  },

  markAllNotificationsRead: async function(userId) {
    var query = SUPA.from('notifications').update({ read: true });
    if (userId) query = query.or('user_id.eq.'+userId+',user_id.is.null');
    return query;
  },

  _toNotif: function(row) {
    return {
      id:      row.id,
      type:    row.type || '',
      title:   row.title,
      body:    row.body || '',
      projRef: row.proj_ref || '',
      userId:  row.user_id || null,
      read:    row.read || false,
      ts:      row.ts || ''
    };
  },

  // ── EQUIPMENT ─────────────────────────────────────────────
  getEquipment: async function() {
    var { data, error } = await SUPA.from('equipment').select('*').order('id');
    if (error) { console.error('getEquipment:', error); return []; }
    return (data || []).map(db._toEquip);
  },

  saveEquipmentItem: async function(item) {
    var row = db._fromEquip(item);
    if (item.id && !item._new) {
      var { error } = await SUPA.from('equipment').update(row).eq('id', item.id);
      if (error) throw error;
    } else {
      var { data, error } = await SUPA.from('equipment').insert(row).select().single();
      if (error) throw error;
      return db._toEquip(data);
    }
    return item;
  },

  saveEquipmentBatch: async function(items) {
    var rows = items.map(function(e) {
      var r = db._fromEquip(e);
      r.id = e.id;
      return r;
    });
    return SUPA.from('equipment').upsert(rows);
  },

  deleteEquipmentItem: async function(id) {
    return SUPA.from('equipment').delete().eq('id', id);
  },

  _toEquip: function(row) {
    return {
      id:           row.id,
      name:         row.name,
      brand:        row.brand || '',
      model:        row.model || '',
      category:     row.category || 'Other',
      condition:    row.condition || 'Good',
      status:       row.status || 'Available',
      serialNo:     row.serial_no || '',
      purchaseDate: row.purchase_date || '',
      value:        row.value || 0,
      lastService:  row.last_service || '',
      nextService:  row.next_service || '',
      assignedTo:   row.assigned_to || '',
      notes:        row.notes || ''
    };
  },

  _fromEquip: function(e) {
    return {
      name:          e.name,
      brand:         e.brand || '',
      model:         e.model || '',
      category:      e.category || 'Other',
      condition:     e.condition || 'Good',
      status:        e.status || 'Available',
      serial_no:     e.serialNo || '',
      purchase_date: e.purchaseDate || '',
      value:         e.value || 0,
      last_service:  e.lastService || '',
      next_service:  e.nextService || '',
      assigned_to:   e.assignedTo || '',
      notes:         e.notes || ''
    };
  },

  // ── INVOICES ──────────────────────────────────────────────
  getInvoices: async function() {
    var { data, error } = await SUPA.from('invoices').select('*').order('id', { ascending: false });
    if (error) { console.error('getInvoices:', error); return []; }
    return data || [];
  },

  saveInvoice: async function(inv) {
    if (!inv.ref) throw new Error('Invoice ref is required');
    var row = {
      ref:            inv.ref,
      client:         inv.client || '',
      project_ref:    inv.projectRef || '',
      amount:         Math.round(inv.amount || 0),
      paid:           Math.round(inv.paid || 0),
      status:         inv.status || 'Draft',
      due_date:       inv.dueDate || '',
      issue_date:     inv.issueDate || '',
      description:    inv.description || inv.notes || '',
      payments:       inv.payments || [],
      line_items:     inv.lineItems || [],
      event_type:     inv.eventType || '',
      event_date:     inv.eventDate || '',
      venue:          inv.venue || '',
      client_phone:   inv.clientPhone || '',
      deposit_amount: inv.depositAmount || 0,
      wht_amount:     inv.whtAmount || 0,
      wht_cert_no:    inv.whtCertNo || '',
      project_name:   inv.projectName || ''
    };
    if (inv.id && !inv._new) {
      var { error } = await SUPA.from('invoices').update(row).eq('id', inv.id);
      if (error) throw error;
    } else {
      var { data, error } = await SUPA.from('invoices').insert(row).select().single();
      if (error) throw error;
      return data;
    }
    return inv;
  },

  deleteInvoice: async function(id) {
    return SUPA.from('invoices').delete().eq('id', id);
  },

  // ── EXPENSES ──────────────────────────────────────────────
  getExpenses: async function() {
    var { data, error } = await SUPA.from('expenses').select('*').order('date', { ascending: false });
    if (error) { console.error('getExpenses:', error); return []; }
    return data || [];
  },

  saveExpense: async function(exp) {
    var row = { date:exp.date, category:exp.category||'', description:exp.description||'',
                amount:exp.amount||0, paid_by:exp.paidBy||'', project_ref:exp.projectRef||'',
                payment_method:exp.paymentMethod||'Cash', receipt:exp.receipt||'', notes:exp.notes||'' };
    if (exp.id && !exp._new) {
      var { error } = await SUPA.from('expenses').update(row).eq('id', exp.id);
      if (error) throw error;
    } else {
      var { data, error } = await SUPA.from('expenses').insert(row).select().single();
      if (error) throw error;
      return data;
    }
    return exp;
  },

  deleteExpense: async function(id) {
    return SUPA.from('expenses').delete().eq('id', id);
  },

  // ── TRG CONTENT SUBMISSIONS ───────────────────────────────
  getTRGSubmissions: async function(monthFilter, yearFilter) {
    var q = SUPA.from('trg_content_submissions').select('*').order('submitted_at', { ascending: false });
    if (monthFilter && monthFilter !== 'all') q = q.eq('month', monthFilter);
    if (yearFilter) q = q.eq('year', String(yearFilter));
    var { data, error } = await q;
    if (error) { console.error('getTRGSubmissions:', error); return []; }
    return (data || []).map(function(row) {
      var sub = row.data || {};
      sub.id = row.id;
      sub.read = row.read;
      sub._status = row.status;
      sub.submittedAt = row.submitted_at;
      sub.submitterName = row.submitter_name || sub.submitterName || '';
      sub.submitterRole = row.submitter_role || sub.submitterRole || '';
      sub.submitterPhone = row.submitter_phone || sub.submitterPhone || '';
      sub.month = row.month || sub.month || '';
      sub.year = row.year || sub.year || '';
      sub.department = row.department || sub.department || '';
      sub._tasksGenerated = row.tasks_generated;
      return sub;
    });
  },

  markTRGSubmissionRead: async function(id) {
    return SUPA.rpc('mark_trg_submission_read', { p_id: id });
  },

  updateTRGSubmissionStatus: async function(id, status) {
    return SUPA.rpc('update_trg_submission_status', { p_id: id, p_status: status });
  },

  markTRGTasksGenerated: async function(id) {
    return SUPA.rpc('mark_trg_tasks_generated', { p_id: id });
  }
};

// ─────────────────────────────────────────────────────────────
// REALTIME SUBSCRIPTIONS
// Call setupRealtime() after login; teardownRealtime() on logout
// ─────────────────────────────────────────────────────────────
var _rtChannels = [];

function setupRealtime() {
  // Tear down any existing subscriptions first
  teardownRealtime();

  // Projects
  _rtChannels.push(
    SUPA.channel('rt_projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, function(payload) {
        handleRealtimeChange('projects', payload);
      })
      .subscribe()
  );

  // Tasks
  _rtChannels.push(
    SUPA.channel('rt_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, function(payload) {
        handleRealtimeChange('tasks', payload);
      })
      .subscribe()
  );

  // Notifications
  _rtChannels.push(
    SUPA.channel('rt_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, function(payload) {
        handleRealtimeChange('notifications', payload);
      })
      .subscribe()
  );

  // Attendance
  _rtChannels.push(
    SUPA.channel('rt_attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, function(payload) {
        handleRealtimeChange('attendance', payload);
      })
      .subscribe()
  );

  // Equipment
  _rtChannels.push(
    SUPA.channel('rt_equipment')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment' }, function(payload) {
        handleRealtimeChange('equipment', payload);
      })
      .subscribe()
  );

  console.log('[CharisOS] Realtime subscriptions active');
}

function teardownRealtime() {
  _rtChannels.forEach(function(ch) {
    SUPA.removeChannel(ch);
  });
  _rtChannels = [];
}

function handleRealtimeChange(table, payload) {
  var event = payload.eventType; // INSERT | UPDATE | DELETE
  var row   = payload.new || payload.old;

  if (table === 'projects') {
    if (event === 'DELETE') {
      PROJECTS = PROJECTS.filter(function(p){ return p.id !== row.id; });
    } else {
      var converted = db._toProject(row);
      var idx = PROJECTS.findIndex(function(p){ return p.id === converted.id; });
      if (idx >= 0) { PROJECTS[idx] = converted; } else { PROJECTS.unshift(converted); }
    }
  } else if (table === 'tasks') {
    if (event === 'DELETE') {
      TASKS = TASKS.filter(function(t){ return t.id !== row.id; });
    } else {
      var converted = db._toTask(row);
      // For non-admin users only cache tasks that belong to them
      var _isAdmin = (typeof S !== 'undefined' && (S.currentRole === 'Admin' || S.currentRole === 'Accountant'));
      var _myId    = (typeof S !== 'undefined' && S.currentUser) ? S.currentUser.id : null;
      var _myName  = (typeof S !== 'undefined' && S.currentProfile && S.currentProfile.name)
                       ? S.currentProfile.name.toLowerCase() : '';
      var _mine = _isAdmin ||
        (converted.assignedUserId && _myId && converted.assignedUserId === _myId) ||
        (converted.assignTo && _myName && converted.assignTo.toLowerCase() === _myName);
      if (_mine) {
        var idx = TASKS.findIndex(function(t){ return t.id === converted.id; });
        if (idx >= 0) { TASKS[idx] = converted; } else { TASKS.push(converted); }
      }
    }
  } else if (table === 'notifications') {
    if (event === 'INSERT') {
      var converted = db._toNotif(row);
      // Only surface notifications targeting this user or broadcast (null user_id)
      var _myId2 = (typeof S !== 'undefined' && S.currentUser) ? S.currentUser.id : null;
      if (!converted.userId || converted.userId === _myId2) {
        NOTIFICATIONS.unshift(converted);
        // Browser notification if permission granted
        if (Notification && Notification.permission === 'granted') {
          new Notification('CharisOS: ' + converted.title, { body: converted.body, icon: '/icon-192.png' });
        }
        // Update app badge count on home screen icon
        if (typeof _updateAppBadge === 'function') _updateAppBadge();
      }
    }
  } else if (table === 'attendance') {
    if (event === 'DELETE') {
      ATTENDANCE = ATTENDANCE.filter(function(r){ return r.id !== row.id; });
    } else {
      var converted = db._toAttendance(row);
      var idx = ATTENDANCE.findIndex(function(r){ return r.id === converted.id; });
      if (idx >= 0) { ATTENDANCE[idx] = converted; } else { ATTENDANCE.push(converted); }
    }
  } else if (table === 'equipment') {
    if (event === 'DELETE') {
      EQUIPMENT = EQUIPMENT.filter(function(e){ return e.id !== row.id; });
    } else {
      var converted = db._toEquip(row);
      var idx = EQUIPMENT.findIndex(function(e){ return e.id === converted.id; });
      if (idx >= 0) { EQUIPMENT[idx] = converted; } else { EQUIPMENT.push(converted); }
    }
  }

  // Re-render without full reload — but skip if the equipment form is open (prevents wiping typed serial numbers)
  if (window.S && (window.S.editingEquip || window.S.addingEquip)) return;
  if (typeof render === 'function') render();
}
