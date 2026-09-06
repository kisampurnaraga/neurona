import "dotenv/config";
import { generateToken, parseAndVerifyToken } from './server/middleware/auth';

const testToken = generateToken({
  user_id: 'founder_root_001',
  email: 'ia.asep12@gmail.com',
  name: 'Master Architect',
  role: 'founder',
  credits: 999999,
  status_aktif: true,
  token_version: 0
});

console.log(testToken);
