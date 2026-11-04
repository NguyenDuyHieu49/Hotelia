// Security smoke tests over HTTP: injection, forged tokens, lockout, webhook signature, error leaks, CORS, rate limit.
// Run against a local API only (it registers a throwaway account and trips the rate limit):
//   API_URL=http://127.0.0.1:3000/api/v1 npm run test:security
const crypto = require('node:crypto');
const API = process.env.API_URL || 'http://127.0.0.1:3000/api/v1';
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(API)) {
  console.error('Refusing to run against a non-local API: ' + API);
  process.exit(1);
}
const results = [];
const check = (id, name, expected, actual, ok) => { results.push(ok); console.log(`${id}\t${ok ? 'ĐẠT' : 'KHÔNG ĐẠT'}\t${expected}\t${actual}\t${name}`); };
const call = async (method, path, { token, body, headers } = {}) => {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch {}
  return { status: r.status, data, text, headers: r.headers };
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

(async () => {
  // H1: NoSQL operator injection in the login body
  const h1 = await call('POST', '/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
  check('H1', 'Chèn toán tử MongoDB vào ô đăng nhập ({"$ne": null})', '400', h1.status, h1.status === 400);

  // H2: operator injection through a query string
  const h2 = await call('GET', '/hotels?destination[$ne]=x&limit=5');
  check('H2', 'Chèn toán tử qua tham số tìm kiếm (destination[$ne])', '400', h2.status, h2.status === 400);

  // H3: regular-expression injection must be matched literally, not as a pattern
  const h3 = await call('GET', '/hotels?destination=' + encodeURIComponent('.*') + '&limit=100');
  check('H3', 'Biểu thức chính quy ".*" trong ô tìm kiếm không trả về toàn bộ khách sạn', '0 kết quả', `${h3.data?.total} kết quả`, h3.status === 200 && h3.data?.total === 0);

  // H4: token signed with another secret
  const forged = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: '000000000000000000000000', role: 'ADMIN', typ: 'access', exp: Math.floor(Date.now() / 1000) + 600 });
  const sig = crypto.createHmac('sha256', 'not-the-server-secret').update(forged).digest('base64url');
  const h4 = await call('GET', '/admin/stats', { token: `${forged}.${sig}` });
  check('H4', 'JWT tự ký bằng khóa khác, tự gán vai trò ADMIN', '401', h4.status, h4.status === 401);

  // H5: unsigned token (alg = none)
  const none = b64({ alg: 'none', typ: 'JWT' }) + '.' + b64({ sub: '000000000000000000000000', role: 'ADMIN', typ: 'access' }) + '.';
  const h5 = await call('GET', '/admin/stats', { token: none });
  check('H5', 'JWT không chữ ký (alg = none)', '401', h5.status, h5.status === 401);

  // H6: account lockout after five wrong passwords (throwaway local account)
  const email = `lockout-${Date.now()}@hotelia.test`, password = 'Lk' + crypto.randomBytes(6).toString('hex') + '9';
  const reg = await call('POST', '/auth/register', { body: { email, password, name: 'Kiểm thử khóa' } });
  const wrong = [];
  for (let i = 0; i < 5; i++) wrong.push((await call('POST', '/auth/login', { body: { email, password: 'SaiMatKhau1' } })).status);
  const locked = await call('POST', '/auth/login', { body: { email, password } });
  check('H6', 'Sai mật khẩu 5 lần rồi nhập đúng: tài khoản bị khóa 15 phút', '5×401 rồi 400', `${wrong.join(',')} rồi ${locked.status}`,
    reg.status === 201 && wrong.every((s) => s === 401) && locked.status === 400 && /locked/i.test(locked.text));

  // H7: forged payOS webhook signature
  const h7 = await call('POST', '/payments/webhooks/payos', { body: { code: '00', desc: 'success', success: true, data: { orderCode: 123, amount: 1, code: '00' }, signature: 'a'.repeat(64) } });
  check('H7', 'Webhook payOS chữ ký giả', '400', h7.status, h7.status === 400);

  // H8: errors do not leak stack traces or internals
  const h8 = await call('GET', '/hotels/not-a-valid-id');
  check('H8', 'Mã định danh sai định dạng: trả 400, không lộ stack trace', '400, không lộ', `${h8.status}, ${/stack|at \//.test(h8.text) ? 'có lộ' : 'không lộ'}`, h8.status === 400 && !/stack|at \//.test(h8.text));

  // H9: CORS refuses an unknown origin
  const pre = await fetch(API + '/auth/login', { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
  const allow = pre.headers.get('access-control-allow-origin');
  check('H9', 'CORS từ chối nguồn lạ (https://evil.example)', 'không cấp quyền', allow ? `cấp ${allow}` : 'không cấp quyền', !allow);

  // H10: rate limit (run last; it throttles this client for one minute)
  const statuses = await Promise.all(Array.from({ length: 120 }, () => fetch(API + '/hotels?limit=1').then((r) => r.status)));
  const limited = statuses.filter((s) => s === 429).length;
  check('H10', 'Gửi 120 yêu cầu trong vài giây (giới hạn 100/phút)', 'có 429', `${limited} yêu cầu bị 429`, limited > 0);

  console.log(`${results.filter(Boolean).length}/${results.length}`);
})().catch((e) => { console.error(e); process.exit(1); });
