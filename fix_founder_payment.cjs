const fs = require('fs');

let content = fs.readFileSync('src/components/FounderDashboard.tsx', 'utf8');

const componentCode = `
const PaymentSettingsPanel = () => {
  const [whatsapp, setWhatsapp] = React.useState('+62');
  const [banks, setBanks] = React.useState([{ id: '1', bank: '', accountNumber: '', accountName: '' }]);
  const [msg, setMsg] = React.useState('');

  React.useEffect(() => {
    fetch('/api/v1/founder/payment', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('neuronna_token') } })
      .then(r => r.json())
      .then(d => {
        if(d.paymentConfig) {
          if(d.paymentConfig.whatsappNumber) setWhatsapp(d.paymentConfig.whatsappNumber);
          if(d.paymentConfig.bankAccounts) setBanks(d.paymentConfig.bankAccounts);
        }
      });
  }, []);

  const save = async () => {
    setMsg('Saving...');
    try {
      const res = await fetch('/api/v1/founder/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('neuronna_token') },
        body: JSON.stringify({ whatsappNumber: whatsapp, bankAccounts: banks })
      });
      if(res.ok) setMsg('Saved successfully!');
      else setMsg('Error saving');
    } catch(e) {
      setMsg('Error saving');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="bg-[#050508] border border-white/10 rounded-xl p-6 max-w-2xl text-slate-300 w-full">
      <h3 className="text-xl font-bold text-white mb-4 font-mono">Payment & WhatsApp Configuration</h3>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 font-mono text-cyan-400">WhatsApp Admin Number</label>
        <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full bg-black border border-white/10 focus:border-cyan-500 rounded-lg p-2.5 text-white outline-none font-mono" />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 flex justify-between items-center font-mono text-cyan-400">
          Bank Accounts / E-Wallets
          <button onClick={() => setBanks([...banks, { id: Date.now().toString(), bank: '', accountNumber: '', accountName: '' }])} className="text-indigo-400 hover:text-indigo-300 text-xs px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20">+ Add Account</button>
        </label>
        {banks.map((b, i) => (
          <div key={b.id} className="flex flex-col sm:flex-row gap-2 mb-3 bg-black/50 p-3 rounded-lg border border-white/5">
            <input placeholder="Bank (e.g. BCA)" value={b.bank} onChange={e => { const nb = [...banks]; nb[i].bank = e.target.value; setBanks(nb); }} className="w-full sm:w-1/3 bg-black border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-indigo-500" />
            <input placeholder="Account No." value={b.accountNumber} onChange={e => { const nb = [...banks]; nb[i].accountNumber = e.target.value; setBanks(nb); }} className="w-full sm:w-1/3 bg-black border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-indigo-500" />
            <input placeholder="Account Name" value={b.accountName} onChange={e => { const nb = [...banks]; nb[i].accountName = e.target.value; setBanks(nb); }} className="w-full sm:w-1/3 bg-black border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-indigo-500" />
            <button onClick={() => { const nb = [...banks]; nb.splice(i, 1); setBanks(nb); }} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition">X</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-6">
        <button onClick={save} className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-6 py-2 rounded-lg font-bold font-mono tracking-wide transition-all shadow-lg shadow-cyan-500/20">Save Settings</button>
        {msg && <span className="text-sm font-mono text-emerald-400">{msg}</span>}
      </div>
    </div>
  );
};
`;

if (!content.includes('const PaymentSettingsPanel =')) {
  // Add it before the main component
  content = content.replace('export const FounderDashboard: React.FC<FounderDashboardProps> =', componentCode + '\nexport const FounderDashboard: React.FC<FounderDashboardProps> =');
  fs.writeFileSync('src/components/FounderDashboard.tsx', content);
  console.log('Added PaymentSettingsPanel');
}
