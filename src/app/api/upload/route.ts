import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminSupabase();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // 1. Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === 'user-avatars');
    if (!bucketExists) {
      await supabase.storage.createBucket('user-avatars', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
      });
    }

    // 2. Prepare file buffer & unique name
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split('.').pop() || 'png';
    const cleanFileName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    // 3. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(cleanFileName, buffer, {
        contentType: file.type || 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 4. Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(cleanFileName);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      fileName: cleanFileName,
    });
  } catch (err: any) {
    console.error('API Upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while uploading image' },
      { status: 500 }
    );
  }
}
