const express = require('express');
const router = express.Router();
const multer = require('multer');
const pool = require('../db');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// GET /ordinances — list all
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ordinances ORDER BY upload_date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get ordinances error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /ordinances — upload new ordinance
router.post('/', upload.single('file'), async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'PDF file is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO ordinances (title, filename, original_name) VALUES ($1, $2, $3) RETURNING *',
      [title.trim(), req.file.filename, req.file.originalname]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Upload ordinance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /ordinances/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT filename FROM ordinances WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      const filePath = path.join(uploadDir, result.rows[0].filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await pool.query('DELETE FROM ordinances WHERE id = $1', [id]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete ordinance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
