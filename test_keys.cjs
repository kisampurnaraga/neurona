fetch('http://localhost:3000/api/projects').then(r=>r.json()).then(data => console.log('Projects from API:', data.map(p=>p.id))).catch(console.error);
