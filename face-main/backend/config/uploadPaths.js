import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRoot = path.resolve(__dirname, '..');
const configuredUploadRoot = process.env.UPLOAD_DIR || process.env.UPLOAD_ROOT;

export const uploadsDir = path.resolve(configuredUploadRoot || path.join(backendRoot, 'uploads'));
export const profilePicsDir = path.join(uploadsDir, 'profile-pics');
export const resumesDir = path.join(uploadsDir, 'resumes');
export const candidateDocumentsDir = path.join(uploadsDir, 'candidate-documents');
export const facesDir = path.join(uploadsDir, 'faces');

export const ensureUploadDirs = () => {
  [uploadsDir, profilePicsDir, resumesDir, candidateDocumentsDir, facesDir].forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });
};

export const uploadPublicPath = (...parts) => `/uploads/${parts.filter(Boolean).join('/')}`;
