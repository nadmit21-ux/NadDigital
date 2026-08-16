const CACHE='anonbox-v2';
const SUPABASE_URL='https://ugyrgvbfwvmuhsjmjtue.supabase.co';
const SUPABASE_KEY='sb_publishable_qHIobQFTgOOrzBttJazZQA_e5-MvmLK';
const LEGACY_API=SUPABASE_URL+'/functions/v1/anonbox-api';

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./'])));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('anonbox-')).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

function jsonResponse(data,status=200){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store',
      'Access-Control-Allow-Origin':'*'
    }
  });
}

async function rpc(name,args,accessToken){
  const headers={
    'Content-Type':'application/json',
    'Accept':'application/json',
    'apikey':SUPABASE_KEY
  };
  if(accessToken) headers['Authorization']='Bearer '+accessToken;
  const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers,
    body:JSON.stringify(args)
  });
  let data=null;
  try{data=await res.json()}catch(e){}
  if(!res.ok){
    const message=(data&&(data.message||data.error||data.hint))||'Une erreur est survenue.';
    throw new Error(message);
  }
  return data;
}

async function handleLegacyApi(request){
  let payload={};
  try{payload=await request.clone().json()}catch(e){return jsonResponse({error:'Requête invalide.'},400)}

  if(payload.action==='public-box'){
    try{
      const data=await rpc('anonbox_get_public_box',{p_slug:String(payload.slug||'')},null);
      if(!data) return jsonResponse({error:'Boîte introuvable.'},404);
      return jsonResponse(data,200);
    }catch(e){
      return jsonResponse({error:e.message||'Impossible de charger la boîte.'},500);
    }
  }

  if(payload.action==='submit'){
    try{
      const data=await rpc('anonbox_submit_message',{
        p_slug:String(payload.slug||''),
        p_body:String(payload.body||''),
        p_mode:payload.mode==='profile'?'profile':'anonymous',
        p_device_id:String(payload.deviceId||'')
      },payload.accessToken||null);
      if(!data||data.ok===false) return jsonResponse({error:(data&&data.error)||'Impossible d’envoyer le message.'},400);
      return jsonResponse(data,201);
    }catch(e){
      return jsonResponse({error:e.message||'Impossible d’envoyer le message.'},500);
    }
  }

  return jsonResponse({error:'Action inconnue.'},400);
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method==='POST'&&req.url===LEGACY_API){
    event.respondWith(handleLegacyApi(req));
    return;
  }
  if(req.method!=='GET') return;
  event.respondWith(fetch(req).catch(()=>caches.match(req)));
});
