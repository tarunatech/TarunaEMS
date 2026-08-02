// scripts/downloadFaceModels.js
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsPath = path.join(__dirname, '../models/face-models');
const baseUrl = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';

const models = [
  // SSD MobileNet V1 - Face Detection
  { name: 'ssd_mobilenetv1_model-weights_manifest.json', url: 'ssd_mobilenetv1_model-weights_manifest.json' },
  { name: 'ssd_mobilenetv1_model.bin', url: 'ssd_mobilenetv1_model.bin' },

  // Face Landmark 68 Point
  { name: 'face_landmark_68_model-weights_manifest.json', url: 'face_landmark_68_model-weights_manifest.json' },
  { name: 'face_landmark_68_model.bin', url: 'face_landmark_68_model.bin' },

  // Face Recognition
  { name: 'face_recognition_model-weights_manifest.json', url: 'face_recognition_model-weights_manifest.json' },
  { name: 'face_recognition_model.bin', url: 'face_recognition_model.bin' }
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded: ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function downloadModels() {
  try {
    // Create models directory if it doesn't exist
    if (!fs.existsSync(modelsPath)) {
      fs.mkdirSync(modelsPath, { recursive: true });
      console.log(`Created directory: ${modelsPath}`);
    }

    console.log('Downloading face-api models...\n');

    for (const model of models) {
      const url = baseUrl + model.url;
      const dest = path.join(modelsPath, model.name);

      // Skip if file already exists
      if (fs.existsSync(dest)) {
        console.log(`⊘ Skipped (already exists): ${model.name}`);
        continue;
      }

      await downloadFile(url, dest);
    }

    console.log('\n✓ All models downloaded successfully!');
    console.log(`Models location: ${modelsPath}`);
  } catch (error) {
    console.error('Error downloading models:', error);
    process.exit(1);
  }
}

downloadModels();

