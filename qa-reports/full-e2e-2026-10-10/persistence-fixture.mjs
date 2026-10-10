import { createServer } from 'node:http';
const html = `<!doctype html><html lang="zh"><meta charset="utf-8"><title>受控持久化验证</title><body style="font:24px sans-serif;padding:48px"><h1>受控浏览器持久化夹具</h1><p>所有状态均为测试值，不是实际账号或登录凭据。</p><button id="save-state" style="font-size:24px;padding:18px">保存受控测试状态</button><pre id="state"></pre><script>
const key = new URL(location.href).searchParams.get('case');
const show = () => document.querySelector('#state').textContent=JSON.stringify({persistentCookie:document.cookie.split('; ').find(x=>x.startsWith('persistent_'+key+'='))??null,sessionCookie:document.cookie.split('; ').find(x=>x.startsWith('session_'+key+'='))??null,localStorage:localStorage.getItem(key)},null,2);
document.querySelector('#save-state').onclick=()=>{document.cookie='persistent_'+key+'=test_value;path=/;max-age=86400';document.cookie='session_'+key+'=test_value;path=/';localStorage.setItem(key,'test_value');show();};show();
</script></body></html>`;
createServer((request, response) => { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html); }).listen(8086, '0.0.0.0');
