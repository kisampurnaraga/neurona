const fs = require('fs');
let content = fs.readFileSync('src/components/VideoTimeline.tsx', 'utf8');

const replacement = `  const resizeImageFile = (file: File, maxWidth = 1024, maxHeight = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(e.target?.result as string);
          
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const isVideoFile = file.type.startsWith('video/');

    if (isVideoFile) {
      if (file.size > 5 * 1024 * 1024) {
        alert(\`Video \${file.name} is too large. Max 5MB.\`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        updateActiveScene({ videoUrl: dataUrl, assetUrl: dataUrl, status: 'COMPLETED' });
        setCustomAssetUrl(dataUrl);
        setHermesMessage(\`Sip! Video "\${file.name}" berhasil diunggah ke adegan #\${selectedSceneIndex + 1}.\`);
      };
      reader.readAsDataURL(file);
    } else {
      try {
        const dataUrl = await resizeImageFile(file, 800, 800, 0.7);
        updateActiveScene({ imageUrl: dataUrl, assetUrl: dataUrl, status: 'COMPLETED' });
        setCustomAssetUrl(dataUrl);
        setHermesMessage(\`Sip! Gambar "\${file.name}" berhasil diunggah ke adegan #\${selectedSceneIndex + 1}.\`);
      } catch (err) {
        console.error(err);
      }
    }
  };`;

const original = `  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const isVideoFile = file.type.startsWith('video/');

      if (isVideoFile) {
        updateActiveScene({ videoUrl: dataUrl, assetUrl: dataUrl, status: 'COMPLETED' });
      } else {
        updateActiveScene({ imageUrl: dataUrl, assetUrl: dataUrl, status: 'COMPLETED' });
      }
      setCustomAssetUrl(dataUrl);
      setHermesMessage(\`Sip! Aset dari file "\${file.name}" berhasil diunggah dan dipasang ke adegan #\${selectedSceneIndex + 1}.\`);
    };
    reader.readAsDataURL(file);
  };`;

content = content.replace(original, replacement);
fs.writeFileSync('src/components/VideoTimeline.tsx', content);
