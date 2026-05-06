const fs = require('fs');

const dashboardPath = './frontend/assets/js/dashboard.js';
let dashboardJs = fs.readFileSync(dashboardPath, 'utf8');

const portfolioArticle = '<article class="svd-card svd-portfolio">';
const securityArticle = `          <article class="svd-card" id="security-card">
            <div class="svd-portfolio-top">
              <div>
                <h3>Security Settings</h3>
                <p>Manage Two-Factor Authentication (2FA)</p>
              </div>
            </div>
            <div style="padding: 1rem 0;">
              <button class="btn btn-outline" id="setup-2fa-btn">Setup Two-Factor Authentication</button>
              <div id="setup-2fa-area" style="display: none; margin-top: 1rem; border: 1px solid #dbe5f0; padding: 1rem; border-radius: 8px;">
                <p>1. Scan this QR code with Google Authenticator or Authy:</p>
                <img id="setup-2fa-qr" src="" alt="QR Code" style="max-width: 200px; display: block; margin: 1rem 0;" />
                <p>2. Enter the 6-digit code to verify and enable:</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                  <input class="input" id="setup-2fa-code" placeholder="6-digit code" style="width: 150px;" />
                  <button class="btn btn-primary" id="enable-2fa-btn">Enable 2FA</button>
                </div>
              </div>
            </div>
          </article>
`;
if (!dashboardJs.includes('security-card')) {
  dashboardJs = dashboardJs.replace(portfolioArticle, securityArticle + '\n' + portfolioArticle);
}

const bindActions = 'bindSidebarActions();';
const securityLogic = `
  const setupBtn = document.getElementById("setup-2fa-btn");
  const enableBtn = document.getElementById("enable-2fa-btn");
  if (setupBtn) {
    setupBtn.addEventListener("click", async () => {
      try {
        const res = await apiRequest("/auth/2fa/setup", { method: "POST" });
        if (res.qrCodeUrl) {
          document.getElementById("setup-2fa-qr").src = res.qrCodeUrl;
          document.getElementById("setup-2fa-area").style.display = "block";
          setupBtn.style.display = "none";
        }
      } catch (err) {
        if (typeof showToast === "function") showToast(err.message, "error");
      }
    });
  }
  if (enableBtn) {
    enableBtn.addEventListener("click", async () => {
      try {
        const code = document.getElementById("setup-2fa-code").value;
        if (!code) {
          if (typeof showToast === "function") showToast("Enter the code", "error");
          return;
        }
        await apiRequest("/auth/2fa/enable", {
          method: "POST",
          body: JSON.stringify({ totpCode: code })
        });
        if (typeof showToast === "function") showToast("2FA Enabled Successfully", "success");
        document.getElementById("setup-2fa-area").innerHTML = "<p style='color:green; font-weight:bold;'>2FA is enabled and active.</p>";
      } catch (err) {
        if (typeof showToast === "function") showToast(err.message, "error");
      }
    });
  }
`;
if (!dashboardJs.includes('enableBtn.addEventListener')) {
  dashboardJs = dashboardJs.replace(bindActions, securityLogic + '\n  ' + bindActions);
  fs.writeFileSync(dashboardPath, dashboardJs);
  console.log('Modified dashboard.js');
}
