import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// ✅ Inhe apne Cloudinary Dashboard se milega
cloudinary.config({
  cloud_name: 'dojmi5ihx',
  api_key: '484877611841484',
  api_secret: '-YiUoCNyqK7l6sJMssknSgosLYk',
});

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return await new Promise<Response>((resolve) => {
      cloudinary.uploader
        .upload_stream({ folder: 'casadenza' }, (error, result) => {
          if (error) {
            return resolve(
              NextResponse.json({ error: 'Upload Failed' }, { status: 500 })
            );
          }

          return resolve(NextResponse.json({ url: result?.secure_url }));
        })
        .end(buffer);
    });
  } catch (e) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}