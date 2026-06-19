document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Hide previous errors
            errorBanner.style.display = 'none';
            
            const clientId = document.getElementById('login-client-id').value.trim();
            const password = document.getElementById('login-password').value;

            if (!clientId || !password) {
                showError('Account ID and Password are required.');
                return;
            }

            // Disable submit button during call
            const originalText = loginSubmitBtn.innerHTML;
            loginSubmitBtn.disabled = true;
            loginSubmitBtn.innerHTML = `⏳ Verifying Credentials...`;

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ clientId, password })
                });

                const data = await res.json();

                if (data.success && data.token) {
                    // Save session details
                    sessionStorage.setItem('authToken', data.token);
                    sessionStorage.setItem('authClientId', data.clientId);
                    sessionStorage.setItem('authClientName', data.name);
                    
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    showError(data.error || 'Authentication failed. Please verify your credentials.');
                }
            } catch (err) {
                console.error('❌ Connection error during authentication:', err);
                showError('Network error. Unable to connect to the authentication server.');
            } finally {
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.innerHTML = originalText;
            }
        });
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorBanner.style.display = 'flex';
    }
});
