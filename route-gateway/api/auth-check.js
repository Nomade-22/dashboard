import {authorizedKey,preflight,requireBrowserOrigin,setCors} from './_lib.js';
export default async function handler(req,res){
  setCors(req,res);if(preflight(req,res))return;if(!requireBrowserOrigin(req,res))return;
  if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
  const key=authorizedKey(req);if(!key)return res.status(401).json({error:'Senha inválida'});
  return res.status(200).json({ok:true,role:'admin'});
}
