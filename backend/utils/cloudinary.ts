import { v2 as cloudinary } from 'cloudinary';

const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

cloudinary.config(cloudinaryConfig);

const isPlaceholder = (value: string | undefined) => !value || value.trim() === '' || value.startsWith('replace_me');

export const getCloudinaryConfigError = () => {
  if (isPlaceholder(cloudinaryConfig.cloud_name)) {
    return 'CLOUDINARY_CLOUD_NAME is not configured';
  }

  if (isPlaceholder(cloudinaryConfig.api_key)) {
    return 'CLOUDINARY_API_KEY is not configured';
  }

  if (isPlaceholder(cloudinaryConfig.api_secret)) {
    return 'CLOUDINARY_API_SECRET is not configured';
  }

  return null;
};

export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  mimeType = 'image/jpeg',
  folder = 'cake-booking'
) => {
  const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;
  const configError = getCloudinaryConfigError();
  if (configError) {
    return {
      url: dataUri,
      publicId: null,
    };
  }

  const result = await cloudinary.uploader.upload(dataUri, { folder });
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};
