export class FaceDataStorage {
  static async saveFaceImage(base64Image, employeeId) {
    try {
      if (!base64Image || !base64Image.startsWith('data:image/')) {
        throw new Error('Invalid image format');
      }

      // Extract image data
      const matches = base64Image.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);
      if (!matches) {
        throw new Error('Invalid base64 image format');
      }

      const imageType = matches[1];
      const imageData = matches[2];

      // Create filename
      const timestamp = Date.now();
      const filename = `face_${employeeId}_${timestamp}.${imageType}`;
      const filepath = `uploads/faces/${filename}`;

      // Ensure upload directory exists
      const uploadDir = 'uploads/faces';
      await fs.mkdir(uploadDir, { recursive: true });

      // Save file
      await fs.writeFile(filepath, imageData, 'base64');

      return filepath;
    } catch (error) {
      console.error('Error saving face image:', error);
      throw error;
    }
  }

  static async deleteFaceImage(filepath) {
    try {
      if (filepath && await fs.access(filepath).then(() => true).catch(() => false)) {
        await fs.unlink(filepath);
      }
    } catch (error) {
      console.warn('Could not delete face image:', error);
    }
  }

  static validateFaceImageSize(base64Image, maxSizeMB = 5) {
    try {
      // Calculate base64 size in bytes
      const sizeInBytes = (base64Image.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      
      return sizeInMB <= maxSizeMB;
    } catch (error) {
      return false;
    }
  }
}

export default router;