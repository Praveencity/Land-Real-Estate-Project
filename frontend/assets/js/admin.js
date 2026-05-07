const usersRoot = document.getElementById("users-root");
const propertiesRoot = document.getElementById("properties-root");
const statsRoot = document.getElementById("stats-root");

const currentUser = getUser();
const isAdmin = roleKey(currentUser?.role) === "admin";

const loadStats = async () => {
  if (!statsRoot) return;
  try {
    const { data } = await apiRequest("/dashboard");
    const stats = [
      { label: "Total Users", value: data.usersCount || 0, icon: "👥" },
      { label: "Properties", value: data.propertiesCount || 0, icon: "🏠" },
      { label: "Registrations", value: data.requestsCount || 0, icon: "📋" },
      { label: "Total Asset Value", value: "₹" + Number(data.totalAssetsValue || 0).toLocaleString("en-IN"), icon: "💰" },
    ];
    statsRoot.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem;">
        ${stats.map((s, i) => {
          const colors = ['#eff6ff', '#f0fdf4', '#fefce8', '#f5f3ff'];
          const textColors = ['#1d4ed8', '#15803d', '#a16207', '#6d28d9'];
          const bg = colors[i % colors.length];
          const fg = textColors[i % textColors.length];
          return `
          <div style="background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; display: flex; align-items: flex-start; gap: 1.2rem; transition: transform 0.2s, box-shadow 0.2s;">
            <div style="background: ${bg}; color: ${fg}; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
              ${s.icon}
            </div>
            <div style="min-width: 0; flex: 1;">
              <p style="margin: 0 0 0.25rem 0; font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.label}</p>
              <h3 style="margin: 0; font-size: 1.6rem; font-weight: 700; color: #0f172a; line-height: 1.2; word-break: break-word; overflow-wrap: break-word;">${s.value}</h3>
            </div>
          </div>
        `}).join("")}
      </div>
    `;
  } catch (err) {
    statsRoot.innerHTML = "";
  }
};

const getRoleBadge = (role) => {
  if (role === "Admin") return "approved";
  if (role === "Government Officer") return "approved";
  return "pending";
};

const loadUsers = async () => {
  if (!usersRoot) return;

  const role = roleKey(currentUser?.role);
  if (!["admin", "government officer"].includes(role)) {
    usersRoot.innerHTML = "<p>Access restricted to Admin and Government Officer.</p>";
    return;
  }

  usersRoot.innerHTML = Array(3).fill(`
    <article class="txn-item skeleton" style="border: none; box-shadow: none; height: 80px;">
      <div class="skeleton-title" style="margin-top: 0.5rem; margin-bottom: 1rem;"></div>
      <div class="skeleton-text short"></div>
    </article>
  `).join("");

  try {
    const { users } = await apiRequest("/auth/users");
    usersRoot.innerHTML = users
      .map((user) => {
        const initials = user.fullName ? user.fullName.charAt(0).toUpperCase() : "?";
        const roleOptions = ["User", "Government Officer", "Admin"].filter(r => r !== "Admin" || user.role === "Admin").map(r => `<option value="${r}" ${user.role === r ? "selected" : ""}>${r}</option>`).join("");
        
        return `
        <article class="admin-user-card" style="display: flex; align-items: center; justify-content: space-between; padding: 1.2rem; margin-bottom: 0.8rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: transform 0.2s; ${!user.isActive ? 'opacity: 0.6; filter: grayscale(1);' : ''}">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), #1e3a8a); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; flex-shrink: 0;">
              ${initials}
            </div>
            <div>
              <p style="margin: 0; font-weight: 600; font-size: 1.05rem; color: #0f172a; display: flex; align-items: center; gap: 0.5rem;">
                ${user.fullName}
                ${!user.isActive ? '<span class="badge" style="background: #fee2e2; color: #991b1b; padding: 0.1rem 0.5rem; font-size: 0.7rem;">Suspended</span>' : ''}
              </p>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; color: #64748b;">${user.email}</p>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem;">
                <span class="svd-badge ${getRoleBadge(user.role)}">${user.role}</span>
                <span style="font-size: 0.75rem; color: #94a3b8;">Joined ${new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          ${isAdmin && user.role !== "Admin" ? `
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
              <select id="role-select-${user._id}" class="input" style="padding: 0.4rem 0.5rem; font-size: 0.85rem; min-height: 0; width: 150px; border-radius: 6px;">
                ${roleOptions}
              </select>
              <button onclick="changeRole('${user._id}')" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; border-radius: 6px;">Update</button>
              <div style="width: 1px; height: 24px; background: #e2e8f0; margin: 0 0.25rem;"></div>
              <button onclick="toggleStatus('${user._id}', '${user.fullName}', ${user.isActive})" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; font-weight: 600; border-radius: 6px; background: ${user.isActive ? '#fffbeb' : '#f0fdf4'}; color: ${user.isActive ? '#b45309' : '#166534'}; border: 1px solid ${user.isActive ? '#fde68a' : '#bbf7d0'};">
                ${user.isActive ? 'Suspend' : 'Activate'}
              </button>
              <button onclick="deleteUser('${user._id}', '${user.fullName}')" class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; font-weight: 600; border-radius: 6px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;">
                Delete
              </button>
            </div>
          ` : ""}
        </article>
      `})
      .join("");
  } catch (error) {
    usersRoot.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

const loadProperties = async () => {
  if (!propertiesRoot) return;

  const role = roleKey(currentUser?.role);
  if (!["admin", "government officer"].includes(role)) {
    propertiesRoot.innerHTML = "<p>Access restricted to Admin and Government Officer.</p>";
    return;
  }

  propertiesRoot.innerHTML = `<p class="svd-empty">Loading properties...</p>`;

  try {
    const { properties } = await apiRequest("/properties/all");
    if (!properties || !properties.length) {
      propertiesRoot.innerHTML = `<p class="svd-empty">No properties found.</p>`;
      return;
    }
    propertiesRoot.innerHTML = properties
      .map(
        (prop) => `
        <article class="admin-property-card" style="display: flex; align-items: center; justify-content: space-between; padding: 1.2rem; margin-bottom: 0.8rem; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
          <div style="display: flex; align-items: center; gap: 1.2rem;">
            <div style="width: 50px; height: 50px; border-radius: 10px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0;">
              ${prop.type === "Residential" ? "🏠" : prop.type === "Commercial" ? "🏢" : prop.type === "Agricultural" ? "🌾" : "📍"}
            </div>
            <div>
              <p style="margin: 0; font-weight: 600; font-size: 1.05rem; color: #0f172a;">${prop.title}</p>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.85rem; color: #64748b; display: flex; align-items: center; gap: 0.4rem;">
                <span>${prop.location}</span>
                <span>&bull;</span>
                <span>${prop.type || "Other"}</span>
                <span>&bull;</span>
                <span style="font-weight: 500; color: #334155;">₹${Number(prop.price || 0).toLocaleString("en-IN")}</span>
              </p>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.4rem;">
                <span class="svd-badge ${prop.approval?.status === 'Approved' ? 'approved' : 'pending'}" style="padding: 0.15rem 0.5rem; border-radius: 12px;">${prop.approval?.status || "Pending"}</span>
                <span style="font-size: 0.75rem; color: #94a3b8;">Owner: ${prop.owner?.fullName || "Unknown"}</span>
              </div>
            </div>
          </div>
          ${isAdmin ? `
            <div style="flex-shrink: 0;">
              <button onclick="deleteProperty('${prop._id}', '${prop.title}')" class="btn" style="padding: 0.5rem 0.8rem; font-size: 0.85rem; font-weight: 600; border-radius: 8px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; transition: all 0.2s;">
                Delete
              </button>
            </div>
          ` : ""}
        </article>
      `
      )
      .join("");
  } catch (error) {
    propertiesRoot.innerHTML = `<p style="color:var(--danger);">${error.message}</p>`;
    showToast(error.message, "error");
  }
};

// Admin Actions
window.deleteUser = async (userId, name) => {
  if (!confirm(`Permanently delete user "${name}"? This cannot be undone.`)) return;
  try {
    const res = await apiRequest(`/auth/users/${userId}`, { method: "DELETE" });
    showToast(res.message, "success");
    loadUsers();
    loadStats();
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.deleteProperty = async (propertyId, title) => {
  if (!confirm(`Permanently delete property "${title}"? This cannot be undone.`)) return;
  try {
    const res = await apiRequest(`/properties/${propertyId}`, { method: "DELETE" });
    showToast(res.message, "success");
    loadProperties();
    loadStats();
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.changeRole = async (userId) => {
  const select = document.getElementById(`role-select-${userId}`);
  if (!select) return;
  const newRole = select.value;
  try {
    const res = await apiRequest(`/auth/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role: newRole })
    });
    showToast(res.message, "success");
    loadUsers();
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.toggleStatus = async (userId, name, currentlyActive) => {
  const action = currentlyActive ? "suspend" : "activate";
  if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${name}"?`)) return;
  try {
    const res = await apiRequest(`/auth/users/${userId}/status`, { method: "PATCH" });
    showToast(res.message, "success");
    loadUsers();
  } catch (err) {
    showToast(err.message, "error");
  }
};

window.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadUsers();
  loadProperties();
});
