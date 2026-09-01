import crypto from 'node:crypto';

export const ALLOWED_ORIGIN = 'https://nomade-22.github.io';
export const UPSTREAM = 'https://73ee0db2-d333-4cc6-9729-ca6149cffff7.created.app';
export const BOOTSTRAP_SALT = 'R0mmRGIQZsAnYM4nmjON0Q';
export const BOOTSTRAP_VERIFIER = 'O0y9vs6ydPjZzK5LvD6-WL-m-Z-AfZYy2Xq1FDi1t_A';
export const ALLOWED_SCOPES = new Set(['orcamentos','calc-hh','precos','adequacoes']);

export function setCors(req,res){
  const origin=String(req.headers.origin||'');
  if(origin===ALLOWED_ORIGIN) res.setHeader('Access-Control-Allow-Origin',ALLOWED_ORIGIN);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Methods','GET,PUT,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Cache-Control','no-store');
}
export function preflight(req,res){
  setCors(req,res);
  if(req.method!=='OPTIONS') return false;
  if(String(req.headers.origin||'')!==ALLOWED_ORIGIN) res.status(403).end(); else res.status(204).end();
  return true;
}
export function requireBrowserOrigin(req,res){
  const origin=String(req.headers.origin||'');
  if(origin && origin!==ALLOWED_ORIGIN){res.status(403).json({error:'Origem não autorizada'});return false}
  return true;
}
const b64u=b=>Buffer.from(b).toString('base64url');
const from64=s=>Buffer.from(String(s||''),'base64url');
export function verifierForKey(key){return b64u(crypto.createHmac('sha256',key).update('multprest-auth-v1').digest())}
export function keyFromRequest(req){
  const m=/^Bearer\s+(.+)$/i.exec(String(req.headers.authorization||''));
  if(!m)return null;try{const key=from64(m[1]);return key.length===32?key:null}catch{return null}
}
export function authorizedKey(req){const key=keyFromRequest(req);if(!key)return null;const actual=verifierForKey(key);const a=Buffer.from(actual),b=Buffer.from(BOOTSTRAP_VERIFIER);return a.length===b.length&&crypto.timingSafeEqual(a,b)?key:null}

async function jsonFetch(url,init={}){
  const r=await fetch(url,{...init,headers:{Accept:'application/json',...(init.headers||{})},cache:'no-store'});
  const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=null}
  if(!r.ok)throw new Error(data?.error||`HTTP ${r.status}`);return data;
}
export async function listRecords(){const data=await jsonFetch(`${UPSTREAM}/api/orcamentos`);return Array.isArray(data)?data:[]}
export async function getRecord(id){return jsonFetch(`${UPSTREAM}/api/orcamentos/${encodeURIComponent(id)}`)}
export async function deleteRecord(id){return jsonFetch(`${UPSTREAM}/api/orcamentos/${encodeURIComponent(id)}`,{method:'DELETE'})}
export async function createRecord(numero,dados){return jsonFetch(`${UPSTREAM}/api/orcamentos`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({numero,descricao:'Estado criptografado da Plataforma Multprest',dados,totais:{}})})}
const stateNumber=scope=>`__MP_STATE_V1__${scope}`;
export async function latestStateRecord(scope){
  const rows=await listRecords();return rows.find(r=>r.numero===stateNumber(scope))||null;
}
function encrypt(data,key,scope){
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(scope));
  const plaintext=Buffer.from(JSON.stringify(data),'utf8');const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);const tag=cipher.getAuthTag();
  return {v:1,alg:'A256GCM',iv:b64u(iv),tag:b64u(tag),ciphertext:b64u(ciphertext)};
}
function decrypt(payload,key,scope){
  if(!payload||payload.v!==1)throw new Error('Formato criptografado inválido');
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,from64(payload.iv));decipher.setAAD(Buffer.from(scope));decipher.setAuthTag(from64(payload.tag));
  const plain=Buffer.concat([decipher.update(from64(payload.ciphertext)),decipher.final()]);return JSON.parse(plain.toString('utf8'));
}
export async function readState(scope,key){
  if(!ALLOWED_SCOPES.has(scope))throw new Error('Escopo inválido');const meta=await latestStateRecord(scope);if(!meta)return null;
  const rec=await getRecord(meta.id);let dados=rec?.dados;if(typeof dados==='string'){try{dados=JSON.parse(dados)}catch{}}
  const payload=dados?.encrypted||dados;return {data:decrypt(payload,key,scope),updatedAt:rec?.updated_at||rec?.created_at||null,id:meta.id};
}
export async function writeState(scope,data,key){
  if(!ALLOWED_SCOPES.has(scope))throw new Error('Escopo inválido');const rows=await listRecords();const olds=rows.filter(r=>r.numero===stateNumber(scope));
  const encrypted=encrypt(data,key,scope);const created=await createRecord(stateNumber(scope),{encrypted,scope,version:1});
  for(const old of olds){try{await deleteRecord(old.id)}catch(e){console.warn('cleanup old state failed',old.id,e?.message)}}
  return {success:true,id:created?.id||null,savedAt:new Date().toISOString()};
}
