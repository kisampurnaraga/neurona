const fs = require('fs');
let content = fs.readFileSync('server/imageService.ts', 'utf8');

const target = `    // Dictionary mappings: Indonesian -> English for visual / character / setting / action terms
    const idToEnMap: [RegExp, string][] = [
      // Meta-narrative / Camera fixes (Point 2)
      [/kamera merekam/gi, 'medium shot of'],
      [/kamera mengambil/gi, 'shot of'],
      [/kamera menyorot/gi, 'focusing on'],
      [/kamera mendekat/gi, 'close up of'],
      [/kamera bergerak/gi, 'tracking shot of'],
      [/kamera berputar/gi, 'orbiting shot of'],
      [/kamera zoom/gi, 'zooming in on'],
      [/kamera/gi, ''], // Strip stray camera mentions that might create literal cameras
      [/sudut kamera/gi, 'camera angle'], // Allow actual angle descriptors

      // Common typos & translation failures (Point 3)
      [/tosakitan/gi, 'in pain'],
      [/kesakitan/gi, 'wincing in pain'],
      [/sneators/gi, 'sneakers'],
      [/instinct/gi, 'distinct'],
      [/meinum/gi, 'medium'],
      [/slictod/gi, 'slicked'],
      [/grainent/gi, 'gradient'],
      [/frustrasi/gi, 'frustrated'],
      [/lelah/gi, 'exhausted'],
      [/bingung/gi, 'confused'],
      [/kecewa/gi, 'disappointed'],`;

const replacement = `    // Dictionary mappings: Indonesian -> English for visual / character / setting / action terms
    const idToEnMap: [RegExp, string][] = [
      // Meta-narrative / Camera fixes (Point 2)
      [/kamera merekam/gi, 'medium shot of'],
      [/kamera mengambil/gi, 'shot of'],
      [/kamera menyorot/gi, 'focusing on'],
      [/kamera mendekat/gi, 'close up of'],
      [/kamera bergerak/gi, 'tracking shot of'],
      [/kamera berputar/gi, 'orbiting shot of'],
      [/kamera zoom/gi, 'zooming in on'],
      [/kamera/gi, ''], // Strip stray camera mentions that might create literal cameras
      [/sudut kamera/gi, 'camera angle'], // Allow actual angle descriptors

      // Common typos & translation failures (Point 3)
      [/tosakitan/gi, 'in pain'],
      [/kesakitan/gi, 'wincing in pain'],
      [/sakit/gi, 'pain'],
      [/sneators/gi, 'sneakers'],
      [/instinct/gi, 'distinct'],
      [/meinum/gi, 'medium'],
      [/slictod/gi, 'slicked'],
      [/grainent/gi, 'gradient'],
      [/frustrasi/gi, 'frustrated'],
      [/lelah/gi, 'exhausted'],
      [/bingung/gi, 'confused'],
      [/kecewa/gi, 'disappointed'],
      [/mengeluh/gi, 'complaining'],
      [/sedih/gi, 'sad'],
      [/murung/gi, 'gloomy'],
      [/marah/gi, 'angry'],
      [/tersenyum/gi, 'smiling'],
      [/tertawa/gi, 'laughing'],
      [/bahagia/gi, 'happy'],
      [/senang/gi, 'glad'],
      [/sepatu biasa/gi, 'ordinary shoes'],
      [/sepatu/gi, 'shoes'],
      [/rusak/gi, 'broken'],
      [/jelek/gi, 'ugly'],
      [/kotor/gi, 'dirty'],
      [/bersih/gi, 'clean'],
      [/baru/gi, 'new'],
      [/lama/gi, 'old'],
      [/memegang/gi, 'holding'],
      [/menunjukkan/gi, 'showing'],
      [/mengoleskan/gi, 'applying'],
      [/memakai/gi, 'wearing'],
      [/berjalan/gi, 'walking'],
      [/berdiri/gi, 'standing'],
      [/duduk/gi, 'sitting'],
      [/berlari/gi, 'running'],
      [/melompat/gi, 'jumping'],`;

content = content.replace(target, replacement);
fs.writeFileSync('server/imageService.ts', content);
