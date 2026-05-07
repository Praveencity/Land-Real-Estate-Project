const authForm = document.getElementById("auth-form");

const bindPasswordToggles = () => {
  const toggleButtons = document.querySelectorAll("[data-password-toggle]");
  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const inputId = button.getAttribute("data-password-toggle");
      const input = document.getElementById(inputId);
      if (!input) return;

      const shouldShow = input.type === "password";
      input.type = shouldShow ? "text" : "password";
      button.textContent = shouldShow ? "Hide" : "Show";
      button.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
    });
  });
};

bindPasswordToggles();

const sendOtpBtn = document.getElementById("send-otp-btn");
const sendLoginOtpBtn = document.getElementById("send-login-otp-btn");

const handleSendOtp = async (btn, type) => {
  const emailInput = document.getElementById("email");
  if (!emailInput || !emailInput.value) {
    if (typeof showToast === "function") showToast("Please enter an email first", "error");
    return;
  }
  try {
    btn.disabled = true;
    btn.textContent = "Sending...";
    await apiRequest("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email: emailInput.value, type })
    });
    if (typeof showToast === "function") showToast("OTP sent! Check your email.", "success");
    btn.textContent = "Sent!";
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Resend OTP";
    }, 30000);
  } catch (err) {
    if (typeof showToast === "function") showToast(err.message, "error");
    btn.disabled = false;
    btn.textContent = "Send OTP";
  }
};

if (sendOtpBtn) {
  sendOtpBtn.addEventListener("click", () => handleSendOtp(sendOtpBtn, "signup"));
}
if (sendLoginOtpBtn) {
  sendLoginOtpBtn.addEventListener("click", () => handleSendOtp(sendLoginOtpBtn, "login"));
}

const toggleOtpBtn = document.getElementById("toggle-otp-login");
if (toggleOtpBtn) {
  toggleOtpBtn.addEventListener("click", () => {
    const passGroup = document.getElementById("password-group");
    const otpGroup = document.getElementById("otp-group");
    const forgotPass = document.querySelector('a[href="forgot-password.html"]');
    const isOtpMode = otpGroup.style.display === "block";

    if (isOtpMode) {
      otpGroup.style.display = "none";
      passGroup.style.display = "block";
      if (forgotPass) forgotPass.parentElement.style.display = "block";
      toggleOtpBtn.textContent = "Login with OTP instead";
      authForm.dataset.mode = "login";
      document.getElementById("password").required = true;
      document.getElementById("otp").required = false;
    } else {
      otpGroup.style.display = "block";
      passGroup.style.display = "none";
      if (forgotPass) forgotPass.parentElement.style.display = "none";
      toggleOtpBtn.textContent = "Login with Password instead";
      authForm.dataset.mode = "login-otp";
      document.getElementById("password").required = false;
      document.getElementById("otp").required = true;
    }
  });
}

if (authForm) {
  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const mode = authForm.dataset.mode;
    const messageBox = document.getElementById("auth-message");
    const submitButton = authForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "";
    messageBox.textContent = "";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Please wait...";
      }

      const formData = new FormData(authForm);
      const payload = Object.fromEntries(formData.entries());
      if (mode === "register") {
        const firstName = String(payload.firstName || "").trim();
        const lastName = String(payload.lastName || "").trim();
        const password = String(payload.password || "");
        const confirmPassword = String(payload.confirmPassword || "");

        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }

        if (!payload.terms) {
          throw new Error("You must accept the legal terms to continue");
        }

        payload.fullName = `${firstName} ${lastName}`.trim();
        delete payload.firstName;
        delete payload.lastName;
        delete payload.confirmPassword;
        delete payload.terms;
      }

      let endpoint;
      if (mode === "register") endpoint = "/auth/signup";
      else if (mode === "login-otp") endpoint = "/auth/login-otp";
      else endpoint = "/auth/login";

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAuth(data.token, data.user);
      if (typeof showToast === "function") {
        showToast(mode === "register" ? "Registration successful" : "Login successful", "success");
      }
      window.location.href = "/pages/dashboard.html";
    } catch (error) {
      messageBox.textContent = error.message;
      messageBox.style.color = "var(--danger)";
      if (typeof showToast === "function") {
        showToast(error.message, "error");
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}


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
