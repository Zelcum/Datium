const API_URL = 'http://localhost:8080/api';

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

function checkAuth() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    const response = await fetch(API_URL + endpoint, {
        ...options,
        headers
    });

    if (response.status === 401) {
        logout();
        return;
    }

    return response;
}
