require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const AdmZip = require('adm-zip');
const fs = require('fs');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// PostgreSQL pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Multer for file uploads
const upload = multer({ dest: process.env.UPLOAD_DIR || '/tmp/uploads/' });

// ---- AUTH ROUTES ----
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO auth_users(email, password_hash) VALUES($1,$2) RETURNING id, email',
      [email, hash]
    );
    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET || 'dev-secret');
    res.json({ token, user: { id: rows[0].id, email: rows[0].email } });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query('SELECT * FROM auth_users WHERE email=$1', [email]);
    if (!rows[0] || !await bcrypt.compare(password, rows[0].password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET || 'dev-secret');
    res.json({ token, user: { id: rows[0].id, email: rows[0].email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const { rows } = await pool.query('SELECT id, email FROM auth_users WHERE id=$1', [userId]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ---- INFECTIONS ROUTES ----
app.get('/api/infections', async (req, res) => {
  const limit = parseInt(req.query.limit) || 150;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM infecciones ORDER BY created_at DESC LIMIT $1',
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get infections error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/infections', async (req, res) => {
  const { mensaje, color, font, user_id, user_email } = req.body;
  if (!mensaje) return res.status(400).json({ error: 'mensaje required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO infecciones(mensaje, color, font, user_id, user_email, environment)
       VALUES($1,$2,$3,$4,$5,'production') RETURNING *`,
      [mensaje, color || '#ffffff', font || 'mono', user_id || null, user_email || null]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '42703') {
      const { rows } = await pool.query(
        `INSERT INTO infecciones(mensaje, color, user_id, user_email)
         VALUES($1,$2,$3,$4) RETURNING *`,
        [mensaje, color || '#ffffff', user_id || null, user_email || null]
      );
      return res.json(rows[0]);
    }
    console.error('Insert infection error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/infections/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM infecciones WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete infection error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/infections', async (req, res) => {
  try {
    await pool.query("DELETE FROM infecciones WHERE environment='production'");
    res.json({ success: true });
  } catch (err) {
    console.error('Clear infections error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---- GALLERY ROUTES ----
const uploadDir = process.env.UPLOAD_DIR || '/tmp/uploads/';

// Extract sort order from filename (e.g., "001_cover.jpg" -> 1)
function extractSortOrder(filename) {
  const match = path.basename(filename).match(/^(\d+)[-_]/);
  return match ? parseInt(match[1]) : 0;
}

app.post('/api/gallery/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const userId = req.body.user_id || null;
  const uploadedFiles = [];

  try {
    // Check if ZIP file
    if (req.file.mimetype === 'application/zip' || req.file.originalname.endsWith('.zip')) {
      const zip = new AdmZip(path.join(uploadDir, req.file.filename));
      const zipEntries = zip.getEntries();

      // Extract all image files from ZIP
      for (const entry of zipEntries) {
        if (entry.isDirectory || !entry.entryName.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|mp4|webm|ogg|mov|avi|mkv|m4v)$/i)) continue;

        const fileName = entry.entryName;
        const destPath = path.join(uploadDir, fileName);
        const destDir = path.dirname(destPath);

        // Ensure directory exists
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        // Write file
        fs.writeFileSync(destPath, entry.getData());

        const sortOrder = extractSortOrder(fileName);

        const { rows } = await pool.query(
          `INSERT INTO archivos(name, path, folder_path, user_id)
           VALUES($1,$2,$3,$4) RETURNING *`,
          [path.basename(fileName), fileName, path.dirname(fileName), userId]
        );
        uploadedFiles.push(rows[0]);
      }

      // Remove the uploaded zip file
      fs.unlinkSync(path.join(uploadDir, req.file.filename));
    } else {
      // Single file upload
      const { rows } = await pool.query(
        `INSERT INTO archivos(name, path, folder_path, user_id)
         VALUES($1,$2,'',$3) RETURNING *`,
        [req.file.originalname, req.file.filename, userId]
      );
      uploadedFiles.push(rows[0]);
    }

    res.json({ uploaded: uploadedFiles.length, files: uploadedFiles });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/gallery', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM archivos ORDER BY name ASC LIMIT 100'
    );
    res.json(rows);
  } catch (err) {
    console.error('List gallery error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/gallery/:fileId', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM archivos WHERE id=$1', [req.params.fileId]);
    if (!rows[0]) return res.status(404).send('Not found');

    const filePath = path.join(uploadDir, rows[0].path);
    res.sendFile(filePath);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---- HEALTH CHECK ----
app.get('/', (req, res) => res.send('JULS OS Backend Online'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`JULS OS Backend running on port ${PORT}`));
