// Toggle between Login and Register views
document.getElementById('showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('registerSection').style.display = 'block';
});

document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerSection').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
});

// --- LOGIN HANDLER ---
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = "";

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        const data = await response.json();
                if (response.ok) {
            // 🟢 Redirect the browser to the protected homepage
            window.location.href = '/home.html';
        } else {
            errorElement.textContent = data.message;
        }
    } catch (err) { errorElement.textContent = "Cannot connect to server."; }
});

// --- REGISTER HANDLER ---
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const regUsername = document.getElementById('regUsername').value;
    const regPassword = document.getElementById('regPassword').value;
    const regMessage = document.getElementById('regMessage');
    regMessage.textContent = "";

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: regUsername, password: regPassword })
        });
        const data = await response.json();
        
        if (response.ok) {
            alert("Account created successfully! Switching to login...");
            document.getElementById('showLogin').click(); // Switch back to login page
        } else {
            regMessage.textContent = data.message;
        }
    } catch (err) { regMessage.textContent = "Cannot connect to server."; }
});
