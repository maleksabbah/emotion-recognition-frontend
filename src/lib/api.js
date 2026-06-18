async uploadFile(file, onProgress) {
    const presign = await this.request('POST', '/upload/request', {
      filename: file.name,
      content_type: file.type || 'image/jpeg',
      size: file.size,
    });

    await this.putToS3(presign.upload_url, file, onProgress);

    const mode = file.type.startsWith('video/') ? 'video' : 'photo';

    const result = await this.request('POST', '/upload/complete', {
      session_id: presign.session_id,
      s3_key: presign.s3_key,
      mode: mode,
    });

    return { session_id: presign.session_id, ...result };
  }
