const CLOUDINARY_CLOUD_NAME = 'dxnuvoj96';
const CLOUDINARY_UPLOAD_PRESET = 'doganin_sesi';
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

// uri: expo-image-picker'dan gelen yerel dosya URI'si
// Döndürür: Cloudinary CDN download URL
export function useUpload() {
  const upload = async (uri) => {
    const formData = new FormData();
    const ext = uri.split('.').pop().toLowerCase();
    const type = ['mp4', 'mov', 'avi', 'mkv'].includes(ext) ? 'video' : 'image';

    formData.append('file', {
      uri,
      type: `${type}/${ext === 'jpg' ? 'jpeg' : ext}`,
      name: `upload_${Date.now()}.${ext}`,
    });
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.secure_url;
  };

  return { upload };
}
