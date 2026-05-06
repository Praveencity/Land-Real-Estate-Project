const fs = require('fs');

const addGoogleBtn = (filePath) => {
  let html = fs.readFileSync(filePath, 'utf8');
  
  if (html.includes('g_id_signin')) return; // Already added

  const googleHeadScript = `<script src="https://accounts.google.com/gsi/client" async defer></script>\n  </head>`;
  html = html.replace('</head>', googleHeadScript);

  const googleHtml = `
          <div style="margin: 1.5rem 0; display: flex; align-items: center; text-align: center; color: var(--muted);">
            <div style="flex: 1; border-top: 1px solid #dbe5f0;"></div>
            <span style="padding: 0 10px; font-size: 0.875rem;">OR</span>
            <div style="flex: 1; border-top: 1px solid #dbe5f0;"></div>
          </div>
          
          <div id="g_id_onload"
               data-client_id="YOUR_GOOGLE_CLIENT_ID"
               data-context="use"
               data-ux_mode="popup"
               data-callback="handleGoogleCredentialResponse"
               data-auto_prompt="false">
          </div>
          <div class="g_id_signin"
               data-type="standard"
               data-shape="rectangular"
               data-theme="outline"
               data-text="continue_with"
               data-size="large"
               data-logo_alignment="left"
               style="display: flex; justify-content: center; margin-bottom: 1.5rem;">
          </div>
`;

  // Insert before the form closing tag or auth-message
  if (html.includes('<p id="auth-message"')) {
    html = html.replace('<p id="auth-message"', googleHtml + '\n          <p id="auth-message"');
  }

  fs.writeFileSync(filePath, html);
  console.log('Added Google button to', filePath);
};

addGoogleBtn('./frontend/pages/login.html');
addGoogleBtn('./frontend/pages/register.html');

// Add handleGoogleCredentialResponse to auth.js
const authPath = './frontend/assets/js/auth.js';
let authJs = fs.readFileSync(authPath, 'utf8');

if (!authJs.includes('handleGoogleCredentialResponse')) {
  authJs += `\n
// Google OAuth Handler
window.handleGoogleCredentialResponse = async (response) => {
  const messageBox = document.getElementById("auth-message");
  if (messageBox) {
    messageBox.textContent = "";
  }
  
  try {
    const data = await apiRequest("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential })
    });
    
    setAuth(data.token, data.user);
    if (typeof showToast === "function") showToast("Google Sign-In successful", "success");
    window.location.href = "/pages/dashboard.html";
  } catch (error) {
    if (messageBox) {
      messageBox.textContent = error.message;
      messageBox.style.color = "var(--danger)";
    }
    if (typeof showToast === "function") showToast(error.message, "error");
  }
};
`;
  fs.writeFileSync(authPath, authJs);
  console.log('Added Google handler to auth.js');
}
