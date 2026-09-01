import {authorizedKey,preflight,readState,requireBrowserOrigin,setCors,writeState,ALLOWED_SCOPES} from './_lib.js';
export default async function handler(req,res){
  setCors(req,res);if(preflight(req,res))return;if(!requireBrowserOrigin(req,res))return;
  const key=authorizedKey(req);if(!key)return res.status(401).json({error:'Sessão inválida'});
  const scope=String(req.query?.scope||'');if(!ALLOWED_SCOPES.has(scope))return res.status(400).json({error:'Escopo inválido'});
  try{
    if(req.method==='GET'){const state=await readState(scope,key);return res.status(200).json(state||{data:null,updatedAt:null});}
    if(req.method==='PUT'){const data=req.body?.data;if(!data||typeof data!=='object')return res.status(400).json({error:'Dados inválidos'});const out=await writeState(scope,data,key);return res.status(200).json(out);}
    return res.status(405).json({error:'Método não permitido'});
  }catch(e){console.error('state gateway error',e);return res.status(500).json({error:'Falha ao acessar o armazenamento seguro'});}
}
