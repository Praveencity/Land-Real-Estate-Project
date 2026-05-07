const currentUser = getUser();
const role = roleKey(currentUser?.role);
let activeStatus = "";

// ── Render file-complaint form based on role ─────────────────────────────────
const renderForm = async () => {
  const section = document.getElementById("file-complaint-section");
  if (!section) return;

  if (role === "government officer") {
    // Load properties for officer to pick from
    let propertyOptions = "<option value=''>Loading properties...</option>";
    try {
      const { properties } = await apiRequest("/properties/all");
      propertyOptions = properties.map(p =>
        `<option value="${p._id}">${p.title} — ${p.location}</option>`
      ).join("");
    } catch {
      propertyOptions = "<option value=''>Could not load properties</option>";
    }

    section.innerHTML = `
      <div class="form-section">
        <h3>🚩 File Property Complaint</h3>
        <p style="color:#64748b; margin:-1rem 0 1.5rem 0; font-size:.92rem;">Report a suspicious or fraudulent property to the Admin for review.</p>
        <form id="complaint-form">
          <div class="form-grid">
            <div class="form-group">
              <label for="target-property">Suspicious Property *</label>
              <select class="input" id="target-property" required>
                <option value="">— Select a property —</option>
                ${propertyOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="complaint-title">Complaint Title *</label>
              <input class="input" id="complaint-title" type="text" placeholder="e.g. Fraudulent ownership documents" required maxlength="150" />
            </div>
            <div class="form-group full">
              <label for="complaint-desc">Description *</label>
              <textarea class="input" id="complaint-desc" rows="4" placeholder="Describe the suspicious activity in detail..." required maxlength="2000" style="resize:vertical;"></textarea>
            </div>
          </div>
          <div style="margin-top:1.2rem; display:flex; gap:.75rem; align-items:center;">
            <button class="btn btn-primary" type="submit" id="submit-btn" style="padding:.7rem 2rem;">Submit Complaint</button>
            <p id="form-msg" style="margin:0; font-size:.9rem;"></p>
          </div>
        </form>
      </div>
    `;
  } else if (role === "user") {
    // Load officers for user to pick from
    let officerOptions = "<option value=''>Loading officers...</option>";
    try {
      const { users } = await apiRequest("/auth/officers");
      const officers = users;
      officerOptions = officers.length
        ? officers.map(o => `<option value="${o._id}">${o.fullName} (${o.email})</option>`).join("")
        : "<option value=''>No officers found</option>";
    } catch {
      officerOptions = "<option value=''>Could not load officers</option>";
    }

    section.innerHTML = `
      <div class="form-section">
        <h3>⚠️ File Complaint Against an Officer</h3>
        <p style="color:#64748b; margin:-1rem 0 1.5rem 0; font-size:.92rem;">Report misconduct or unfair treatment by a Government Officer.</p>
        <form id="complaint-form">
          <div class="form-grid">
            <div class="form-group">
              <label for="target-officer">Government Officer *</label>
              <select class="input" id="target-officer" required>
                <option value="">— Select an officer —</option>
                ${officerOptions}
              </select>
            </div>
            <div class="form-group">
              <label for="complaint-title">Complaint Title *</label>
              <input class="input" id="complaint-title" type="text" placeholder="e.g. Unfair property rejection" required maxlength="150" />
            </div>
            <div class="form-group full">
              <label for="complaint-desc">Description *</label>
              <textarea class="input" id="complaint-desc" rows="4" placeholder="Describe what happened in detail..." required maxlength="2000" style="resize:vertical;"></textarea>
            </div>
          </div>
          <div style="margin-top:1.2rem; display:flex; gap:.75rem; align-items:center;">
            <button class="btn btn-primary" type="submit" id="submit-btn" style="padding:.7rem 2rem;">Submit Complaint</button>
            <p id="form-msg" style="margin:0; font-size:.9rem;"></p>
          </div>
        </form>
      </div>
    `;
  }
  // Admin sees no form — just the list
  if (role === "admin") {
    document.getElementById("page-subtitle").textContent = "Review all complaints filed by users and officers.";
    document.getElementById("list-heading").textContent = "All Complaints";
  }

  // Attach submit handler
  document.getElementById("complaint-form")?.addEventListener("submit", handleSubmit);
};

// ── Submit complaint ─────────────────────────────────────────────────────────
const handleSubmit = async (e) => {
  e.preventDefault();
  const btn = document.getElementById("submit-btn");
  const msgEl = document.getElementById("form-msg");
  msgEl.textContent = "";

  const title = document.getElementById("complaint-title").value.trim();
  const description = document.getElementById("complaint-desc").value.trim();
  const type = role === "government officer" ? "property" : "officer";
  const targetProperty = document.getElementById("target-property")?.value || undefined;
  const targetOfficer = document.getElementById("target-officer")?.value || undefined;

  try {
    btn.disabled = true;
    btn.textContent = "Submitting...";

    await apiRequest("/complaints", {
      method: "POST",
      body: JSON.stringify({ type, title, description, targetProperty, targetOfficer }),
    });

    msgEl.textContent = "✅ Complaint submitted! Admin has been notified.";
    msgEl.style.color = "var(--success)";
    e.target.reset();
    if (typeof showToast === "function") showToast("Complaint submitted successfully", "success");
    loadComplaints();
  } catch (err) {
    msgEl.textContent = err.message;
    msgEl.style.color = "var(--danger)";
    if (typeof showToast === "function") showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit Complaint";
  }
};

// ── Status update (admin) ─────────────────────────────────────────────────────
window.updateStatus = async (id) => {
  const status = document.getElementById(`status-${id}`).value;
  const adminNotes = document.getElementById(`notes-${id}`).value.trim();
  try {
    const res = await apiRequest(`/complaints/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, adminNotes }),
    });
    if (typeof showToast === "function") showToast(res.message, "success");
    loadComplaints();
  } catch (err) {
    if (typeof showToast === "function") showToast(err.message, "error");
  }
};

// ── Status badge helper ───────────────────────────────────────────────────────
const statusBadge = (s) => {
  const cls = { Pending: "pending", "Under Review": "under-review", Resolved: "resolved", Dismissed: "dismissed" };
  return `<span class="status-badge status-${cls[s] || "pending"}">${s}</span>`;
};

// ── Load and render complaints ────────────────────────────────────────────────
const loadComplaints = async () => {
  const root = document.getElementById("complaints-root");
  root.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:2rem;">Loading...</p>`;

  try {
    const params = new URLSearchParams();
    if (activeStatus) params.set("status", activeStatus);
    const { complaints } = await apiRequest(`/complaints?${params.toString()}`);

    if (!complaints.length) {
      root.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p style="font-size:1.1rem; font-weight:600; color:#475569;">No complaints found</p>
          <p style="color:#94a3b8;">When complaints are filed, they will appear here.</p>
        </div>`;
      return;
    }

    root.innerHTML = complaints.map((c) => {
      const isAdmin = role === "admin";
      const targetInfo = c.type === "property"
        ? `🏠 <strong>${c.targetProperty?.title || "Unknown property"}</strong> — ${c.targetProperty?.location || ""}`
        : `👮 <strong>${c.targetOfficer?.fullName || "Unknown officer"}</strong> (${c.targetOfficer?.email || ""})`;

      return `
        <div class="complaint-card">
          <div class="complaint-meta">
            <span class="type-badge type-${c.type}">${c.type === "property" ? "🏠 Property" : "👮 Officer"}</span>
            ${statusBadge(c.status)}
            <span style="font-size:.8rem; color:#94a3b8;">${new Date(c.createdAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}</span>
            ${isAdmin ? `<span style="font-size:.82rem; color:#64748b;">by <strong>${c.complainant?.fullName}</strong> (${c.complainant?.role})</span>` : ""}
          </div>
          <h3 class="complaint-title">${c.title}</h3>
          <p class="complaint-desc">${c.description}</p>
          <p class="complaint-target">Against: ${targetInfo}</p>

          ${c.adminNotes ? `<div class="complaint-admin-notes"><strong>Admin Notes:</strong> ${c.adminNotes}</div>` : ""}

          ${isAdmin ? `
            <div class="admin-review-panel">
              <h4>⚙️ Admin Review</h4>
              <div style="display:flex; gap:.75rem; flex-wrap:wrap; align-items:flex-end;">
                <div style="flex:1; min-width:160px;">
                  <label style="font-size:.85rem; font-weight:600; display:block; margin-bottom:.3rem;">Status</label>
                  <select class="input" id="status-${c._id}" style="padding:.5rem; font-size:.9rem;">
                    ${["Pending","Under Review","Resolved","Dismissed"].map(s =>
                      `<option value="${s}" ${c.status === s ? "selected" : ""}>${s}</option>`
                    ).join("")}
                  </select>
                </div>
                <div style="flex:2; min-width:200px;">
                  <label style="font-size:.85rem; font-weight:600; display:block; margin-bottom:.3rem;">Admin Notes</label>
                  <input class="input" id="notes-${c._id}" type="text" value="${c.adminNotes || ""}" placeholder="Add review notes..." style="padding:.5rem; font-size:.9rem;" />
                </div>
                <button onclick="updateStatus('${c._id}')" class="btn btn-primary" style="padding:.5rem 1.2rem; font-size:.9rem; white-space:nowrap;">Update</button>
              </div>
            </div>
          ` : ""}
        </div>
      `;
    }).join("");
  } catch (err) {
    root.innerHTML = `<p style="color:var(--danger); text-align:center;">${err.message}</p>`;
  }
};

// ── Filter tabs ───────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await renderForm();
  await loadComplaints();

  document.getElementById("filter-tabs")?.querySelectorAll(".complaint-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".complaint-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeStatus = tab.dataset.status;
      loadComplaints();
    });
  });
});
