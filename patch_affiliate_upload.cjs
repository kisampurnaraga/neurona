const fs = require('fs');
let content = fs.readFileSync('src/components/AffiliateConfigModal.tsx', 'utf8');

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (type === 'VIDEO') {
        if (file.size > 5 * 1024 * 1024) {
           alert(\`Video \${file.name} is too large. Max 5MB.\`);
           continue;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          const newAsset: ProductAsset = {
            id: Math.random().toString(36).substring(2, 9),
            type,
            url: result,
            name: file.name,
            size: file.size
          };
          setAssets(prev => [...prev, newAsset]);
        };
        reader.readAsDataURL(file);
      } else {
        try {
          const url = await resizeImageFile(file, 800, 800, 0.7);
          const newAsset: ProductAsset = {
            id: Math.random().toString(36).substring(2, 9),
            type: 'IMAGE',
            url,
            name: file.name,
            size: Math.round(url.length * 0.75)
          };
          setAssets(prev => [...prev, newAsset]);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };`;

const original = `  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'VIDEO') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const newAsset: ProductAsset = {
          id: Math.random().toString(36).substring(2, 9),
          type,
          url: result,
          name: file.name,
          size: file.size
        };
        setAssets(prev => [...prev, newAsset]);
      };
      reader.readAsDataURL(file);
    });
  };`;

content = content.replace(original, replacement);
fs.writeFileSync('src/components/AffiliateConfigModal.tsx', content);
