const fs = require('fs');
let code = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf-8');

const targetLogic = `      if (data.success && data.finalVideoUrl) {
        log('🎉 SUKSES: Seluruh adegan video berhasil dijahit dan disatukan menjadi film utuh!');
        setStitchProgress(100);
        setActiveStitchStep('Selesai');
        neuronaVoice.speak("Selamat! Proses penggabungan video telah berhasil diselesaikan secara utuh");
        setFinalVideoUrl(data.finalVideoUrl);
      } else {
        throw new Error(data.error || data.message || 'Gagal menghasilkan master video final.');
      }
    } catch (e: any) {
      console.error('[Stitch Error]', e);
      const errMsg = e.message || 'Terjadi kendala saat menggabungkan video.';
      log(\`❌ GAGAL PENGGABUNGAN: \${errMsg}\`);
      setStitchProgress(0);
      setActiveStitchStep('Gagal');
      setFinalVideoUrl(null);
      neuronaVoice.speak(\`Gagal menggabungkan video: \${errMsg}\`);
    } finally {
      setIsStitching(false);
    }`;

const replacementLogic = `      let isAsyncProcessing = false;

      if (data.success) {
        if (data.status === 'PROCESSING') {
          log('⏳ PROSES: ' + (data.message || 'Perakitan video master sedang berjalan di latar belakang...'));
          setStitchProgress(90);
          setActiveStitchStep('Menyusun adegan di server...');
          isAsyncProcessing = true;
          // We rely on useEffect to handle completion
        } else if (data.finalVideoUrl) {
          log('🎉 SUKSES: Seluruh adegan video berhasil dijahit dan disatukan menjadi film utuh!');
          setStitchProgress(100);
          setActiveStitchStep('Selesai');
          neuronaVoice.speak("Selamat! Proses penggabungan video telah berhasil diselesaikan secara utuh");
          setFinalVideoUrl(data.finalVideoUrl);
        } else {
          throw new Error('Gagal menghasilkan master video final.');
        }
      } else {
        throw new Error(data.error || data.message || 'Gagal menghasilkan master video final.');
      }
      
      if (!isAsyncProcessing) {
        setIsStitching(false);
      }
    } catch (e: any) {
      console.error('[Stitch Error]', e);
      const errMsg = e.message || 'Terjadi kendala saat menggabungkan video.';
      log(\`❌ GAGAL PENGGABUNGAN: \${errMsg}\`);
      setStitchProgress(0);
      setActiveStitchStep('Gagal');
      setFinalVideoUrl(null);
      neuronaVoice.speak(\`Gagal menggabungkan video: \${errMsg}\`);
      setIsStitching(false);
    }
  };`;

if (code.includes(targetLogic)) {
  code = code.replace(targetLogic, replacementLogic);
  fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', code);
  console.log('REPLACED STITCH LOGIC');
} else {
  console.log('TARGET LOGIC NOT FOUND');
}
