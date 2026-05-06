const fs = require('fs');

// Update register.html
const registerPath = './frontend/pages/register.html';
let registerHtml = fs.readFileSync(registerPath, 'utf8');

const targetEmailField = `            <div class="register-field">
              <label for="email">Official Email Address</label>
              <input class="input" id="email" name="email" type="email" placeholder="jane.doe@example.com" required />
            </div>`;

const newEmailField = `            <div class="register-field">
              <label for="email">Official Email Address</label>
              <div style="display: flex; gap: 0.5rem;">
                <input class="input" id="email" name="email" type="email" placeholder="jane.doe@example.com" required style="flex: 1;" />
                <button type="button" class="btn btn-outline" id="send-otp-btn">Send OTP</button>
              </div>
            </div>

            <div class="register-field">
              <label for="otp">Verification Code (OTP)</label>
              <input class="input" id="otp" name="otp" type="text" placeholder="6-digit code sent to email" required />
            </div>`;

if (!registerHtml.includes('send-otp-btn')) {
  registerHtml = registerHtml.replace(targetEmailField, newEmailField);
  fs.writeFileSync(registerPath, registerHtml);
  console.log('Modified register.html');
}

// Update auth.js
const authPath = './frontend/assets/js/auth.js';
let authJs = fs.readFileSync(authPath, 'utf8');

const targetEvent = 'if (authForm) {';
const newLogic = `const sendOtpBtn = document.getElementById("send-otp-btn");
if (sendOtpBtn) {
  sendOtpBtn.addEventListener("click", async () => {
    const emailInput = document.getElementById("email");
    if (!emailInput || !emailInput.value) {
      if (typeof showToast === "function") showToast("Please enter an email first", "error");
      return;
    }
    try {
      sendOtpBtn.disabled = true;
      sendOtpBtn.textContent = "Sending...";
      await apiRequest("/auth/send-otp", {
        method: "POST",
        body: JSON.stringify({ email: emailInput.value })
      });
      if (typeof showToast === "function") showToast("OTP sent! (If you are using Ethereal, check backend terminal)", "success");
      sendOtpBtn.textContent = "Sent!";
      setTimeout(() => {
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = "Resend OTP";
      }, 30000); // Allow resend after 30s
    } catch (err) {
      if (typeof showToast === "function") showToast(err.message, "error");
      sendOtpBtn.disabled = false;
      sendOtpBtn.textContent = "Send OTP";
    }
  });
}

if (authForm) {`;

if (!authJs.includes('sendOtpBtn')) {
  authJs = authJs.replace(targetEvent, newLogic);
  fs.writeFileSync(authPath, authJs);
  console.log('Modified auth.js');
}
