import fs from 'fs';
let content = fs.readFileSync('src/components/AffiliateConfigModal.tsx', 'utf8');

// 1. Remove SAMPLE_PRESETS array
const presetRegex = /const SAMPLE_PRESETS = \[[\s\S]*?\];\n*/;
content = content.replace(presetRegex, '');

// 2. Fix state initializations
content = content.replace("const [productName, setProductName] = useState('Aeroflex HyperRun V2 Sneakers');", "const [productName, setProductName] = useState('');");
content = content.replace("const [category, setCategory] = useState('Sepatu & Fashion');", "const [category, setCategory] = useState('Lainnya');"); // Maybe keep category or empty string? The UI might need it. Let's keep it empty or sensible.
content = content.replace("const [keyBenefits, setKeyBenefits] = useState('Super ringan 180gr, bantalan cloud cushion empuk gak bikin lecet, sol karet anti-slip');", "const [keyBenefits, setKeyBenefits] = useState('');");
content = content.replace("const [pricePromo, setPricePromo] = useState('Lagi Diskon Kilat 50% + Promo Gratis Ongkir');", "const [pricePromo, setPricePromo] = useState('');");
content = content.replace("const [callToAction, setCallToAction] = useState('Klik logo keranjang kuning di kiri bawah sebelum kehabisan!');", "const [callToAction, setCallToAction] = useState('');");
content = content.replace("const [characterImage, setCharacterImage] = useState(SAMPLE_PRESETS[0].creatorImage || '');", "const [characterImage, setCharacterImage] = useState('');");

const oldAssetsInit = `const [assets, setAssets] = useState<ProductAsset[]>(initialAssets.length > 0 ? initialAssets : SAMPLE_PRESETS[0].images.map((img, idx) => ({
    id: \`sample-shoe-\${idx}\`,
    type: 'IMAGE',
    url: img.url,
    name: img.name
  })));`;
content = content.replace(oldAssetsInit, `const [assets, setAssets] = useState<ProductAsset[]>(initialAssets);`);

// 3. Remove applyPreset function
const applyPresetRegex = /const applyPreset = \([\s\S]*?\}\s*;\s*\n/g;
content = content.replace(applyPresetRegex, '');

// 4. Remove UI block for Quick 1-Click Test Presets Banner
// It starts with `{/* Quick 1-Click Test Presets Banner */}` and ends before `{/* 1. Upload Product Photos, Character & Reference Video */}`
const bannerRegex = /\{\/\* Quick 1-Click Test Presets Banner \*\/\}[\s\S]*?(?=\{\/\* 1\. Upload Product Photos)/;
content = content.replace(bannerRegex, '');

fs.writeFileSync('src/components/AffiliateConfigModal.tsx', content);
console.log("Removed Affiliate presets successfully.");
