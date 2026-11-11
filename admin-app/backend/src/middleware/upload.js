const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const urlPath = req.originalUrl || '';
    let section = 'general';

    if (urlPath.includes('/blogs')) section = 'blogs';
    else if (urlPath.includes('/team-members')) section = 'team';
    else if (urlPath.includes('/testimonials')) section = 'testimonials';
    else if (urlPath.includes('/highlights')) section = 'highlights';
    else if (urlPath.includes('/gallery')) section = 'gallery';
    else if (urlPath.includes('/resources')) section = 'resources';
    else if (urlPath.includes('/teams')) section = 'team';
    else if (urlPath.includes('/clients')) section = 'clients'; // ✅ ADDED
    else if (urlPath.includes('/hero')) section = 'carousel'; // ✅ Saves to public/uploads/carousel
    else if (req.body.section) section = req.body.section;

    // Prefer an absolute persistent path (Render/cloud/Supabase Storage migration).
    // Fallback keeps local development working with the monorepo layout.
    const baseDir = process.env.UPLOAD_DIR
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.join(__dirname, '../../public/uploads');
    const uploadPath = path.join(baseDir, section);
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname).toLowerCase();
  const isImage = /^image\/(jpeg|jpg|png|gif|webp|svg\+xml|avif)$/.test(mime) || /\.(jpe?g|png|gif|webp|svg|avif)$/.test(ext);
  const isVideo = /^video\/(mp4|webm|quicktime)$/.test(mime) || /\.(mp4|webm|mov)$/.test(ext);
  const isPdf = mime === 'application/pdf' || ext === '.pdf';
  if (isImage || isVideo || isPdf) return cb(null, true);
  return cb(new Error('Only images, MP4/WebM/MOV videos and PDF files are allowed'));
};

// Supabase Storage handles production uploads directly from the browser. This
// multer path is only the offline/local fallback, so keep a bounded limit.
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }
});

module.exports = upload;