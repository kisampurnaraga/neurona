import fs from 'fs';

let content = fs.readFileSync('src/server/fcc/FounderService.ts', 'utf8');

const paymentCode = `
  private static paymentConfig: {
    whatsappNumber: string;
    bankAccounts: Array<{ id: string; bank: string; accountNumber: string; accountName: string }>;
  } = {
    whatsappNumber: '+6281234567890',
    bankAccounts: [
      { id: '1', bank: 'BCA', accountNumber: '1234567890', accountName: 'Neuronna Global' }
    ]
  };

  static getPaymentConfig() {
    return this.paymentConfig;
  }

  static updatePaymentConfig(data: { whatsappNumber?: string; bankAccounts?: Array<{ id: string; bank: string; accountNumber: string; accountName: string }> }) {
    if (data.whatsappNumber !== undefined) this.paymentConfig.whatsappNumber = data.whatsappNumber;
    if (data.bankAccounts !== undefined) this.paymentConfig.bankAccounts = data.bankAccounts;
  }
`;

content = content.replace('export class FounderService {', 'export class FounderService {' + paymentCode);
fs.writeFileSync('src/server/fcc/FounderService.ts', content);
console.log('Patched');
