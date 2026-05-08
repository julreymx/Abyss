const API = import.meta.env.VITE_API_URL || 'https://os-mental-backend.onrender.com';

export function getToken() {
  return localStorage.getItem('juls_token');
}

export async function login(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('juls_token', data.token);
    localStorage.setItem('juls_user', JSON.stringify(data.user));
  }
  return data;
}

export async function register(email, password) {
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('juls_token', data.token);
    localStorage.setItem('juls_user', JSON.stringify(data.user));
  }
  return data;
}

export function logout() {
  localStorage.removeItem('juls_token');
  localStorage.removeItem('juls_user');
}

export async function getSession() {
  const token = getToken();
  if (!token) return { data: { session: null } };
  try {
    const res = await fetch(`${API}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return { data: { session: null } };
    const user = await res.json();
    return { data: { session: { user } } };
  } catch {
    return { data: { session: null } };
  }
}

export function onAuthStateChange(callback) {
  let prev = !!getToken();
  const interval = setInterval(() => {
    const curr = !!getToken();
    if (prev !== curr) {
      prev = curr;
      const user = curr ? JSON.parse(localStorage.getItem('juls_user')) : null;
      callback(curr ? 'SIGNED_IN' : 'SIGNED_OUT', { user });
    }
  }, 2000);
  return {
    data: { subscription: { unsubscribe: () => clearInterval(interval) } }
  };
}

// --- Infections ---
export async function insertInfection(msg, color = '#ffffff', userId = null, email = null, font = 'mono') {
  const res = await fetch(`${API}/api/infections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
    body: JSON.stringify({ mensaje: msg, color, font, user_id: userId, user_email: email })
  });
  return res.json();
}

export async function getRecentInfections(limit = 150) {
  const res = await fetch(`${API}/api/infections?limit=${limit}`);
  return res.json();
}

export async function limpiarAbismo() {
  const res = await fetch(`${API}/api/infections`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  return res.json();
}

export async function deleteInfection(id) {
  const res = await fetch(`${API}/api/infections/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  return res.json();
}

// --- Polling-based realtime subscription ---
export function subscribeToInfections(callback) {
  let latestIds = [];
  const interval = setInterval(async () => {
    const data = await getRecentInfections(150);
    const newIds = data.map(d => d.id).join(',');
    if (newIds !== latestIds) {
      latestIds = newIds;
      data.forEach(item => callback(item));
    }
  }, 5000);
  // Initial load
  getRecentInfections(150).then(data => {
    latestIds = data.map(d => d.id).join(',');
    data.forEach(item => callback(item));
  });
  return {
    unsubscribe: () => clearInterval(interval)
  };
}

// --- Gallery ---
export async function uploadFile(file, userId = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (userId) formData.append('user_id', userId);
  const res = await fetch(`${API}/api/gallery/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: formData
  });
  return res.json();
}

export function getGalleryFileUrl(fileId) {
  return `${API}/api/gallery/${fileId}`;
}

export async function listGalleryFiles() {
  const res = await fetch(`${API}/api/gallery`);
  return res.json();
}
