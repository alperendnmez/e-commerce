import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
});

export const uploadToS3 = async (file: string, key: string) => {
  if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME is not defined in environment variables.');
  }

  const base64Data = Buffer.from(file.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const contentType = file.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Body: base64Data,
    ContentType: contentType,
    ACL: 'public-read',
  };

  const result = await s3.upload(params).promise();
  return result.Location; // Yüklenen dosyanın URL'sini döndür
};

export const deleteFromS3 = async (key: string) => {
  if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME is not defined in environment variables.');
  }

  const bucketUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key.replace(bucketUrl, ''),
  };

  await s3.deleteObject(params).promise();
};
