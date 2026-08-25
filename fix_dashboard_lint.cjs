const fs = require('fs');

let content = fs.readFileSync('src/components/FounderDashboard.tsx', 'utf8');

if (content.includes('<PaymentSettingsPanel />') && !content.includes('const PaymentSettingsPanel =')) {
    // If the component definition was somehow missed but the usage is there, we need to add it.
    // However, looking at the previous patch script, it was added at the very end of the file.
    // Let's verify if it's exported or placed correctly.
    console.log("Lint error indicates PaymentSettingsPanel is missing or out of scope.");
}

// Let's extract PaymentSettingsPanel and place it before FounderDashboard
const paymentPanelMatch = content.match(/const PaymentSettingsPanel = \(\) => \{[\s\S]*?\};\n/);

if (paymentPanelMatch) {
    const paymentPanelCode = paymentPanelMatch[0];
    // Remove it from current position
    content = content.replace(paymentPanelCode, '');
    
    // Insert it before FounderDashboard
    content = content.replace('export const FounderDashboard: React.FC<FounderDashboardProps> =', paymentPanelCode + '\nexport const FounderDashboard: React.FC<FounderDashboardProps> =');
    
    fs.writeFileSync('src/components/FounderDashboard.tsx', content);
    console.log("Moved PaymentSettingsPanel above FounderDashboard");
} else {
    console.log("PaymentSettingsPanel not found in file.");
}
