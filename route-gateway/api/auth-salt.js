import {BOOTSTRAP_SALT,preflight,requireBrowserOrigin,setCors} from './_lib.js';
export default async function handler(req,res){
  setCors(req,res);if(preflight(req,res))return;if(!requireBrowserOrigin(req,res))return;
  if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
  return res.status(200).json({salt:BOOTSTRAP_SALT,kdf:'PBKDF2-SHA256',iterations:310000});
}
