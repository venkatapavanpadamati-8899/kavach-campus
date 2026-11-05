const fs = require('fs');
const filePath = 'src/app/api/student/safe-box/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetPost = `      if (noteError) {
        console.error('Safe box private note save failed:', noteError);
        const { error: cleanupError } = await supabase
          .from('evidence')
          .delete()
          .eq('id', record.id)
          .eq('uploaded_by', user.id);
        if (cleanupError) {
          console.error('Safe box evidence cleanup after note failure failed:', cleanupError);
        }
        const { error: storageCleanupError } = await storageClient.storage
          .from('kavach-evidence')
          .remove([storagePath]);
        if (storageCleanupError) {
          console.error('Safe box storage cleanup after note failure failed:', storageCleanupError);
        }
        return NextResponse.json({ error: 'Failed to save the private note; the upload was rolled back.' }, { status: 500 });
      }`;

const targetPostCRLF = targetPost.replace(/\n/g, '\r\n');

const replacePost = `      if (noteError) {
        const isTableMissing = noteError.code === '42P01' || (noteError.message && noteError.message.includes('does not exist'));
        if (isTableMissing) {
          console.warn('Safe box private note save skipped: migration 016 table safe_box_private_notes is pending');
        } else {
          console.error('Safe box private note save failed:', noteError);
          const { error: cleanupError } = await supabase
            .from('evidence')
            .delete()
            .eq('id', record.id)
            .eq('uploaded_by', user.id);
          if (cleanupError) {
            console.error('Safe box evidence cleanup after note failure failed:', cleanupError);
          }
          const { error: storageCleanupError } = await storageClient.storage
            .from('kavach-evidence')
            .remove([storagePath]);
          if (storageCleanupError) {
            console.error('Safe box storage cleanup after note failure failed:', storageCleanupError);
          }
          return NextResponse.json({ error: 'Failed to save the private note; the upload was rolled back.' }, { status: 500 });
        }
      }`;

const replacePostCRLF = replacePost.replace(/\n/g, '\r\n');

if (content.includes(targetPostCRLF)) {
  content = content.replace(targetPostCRLF, replacePostCRLF);
  console.log('POST fallback applied (CRLF)');
} else if (content.includes(targetPost)) {
  content = content.replace(targetPost, replacePost);
  console.log('POST fallback applied (LF)');
} else {
  console.error('POST target not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('POST update completed.');
