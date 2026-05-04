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

      const endpoint = mode === "register" ? "/auth/signup" : "/auth/login";

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
