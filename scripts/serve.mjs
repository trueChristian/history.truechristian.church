import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../_site');
const port=Number(process.env.PORT||8080);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.ico':'image/x-icon','.md':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const base=(process.env.SITE_BASE_PATH||'').replace(/\/$/,'');
    if(base && (pathname===base || pathname.startsWith(base+'/')))pathname=pathname.slice(base.length)||'/';
    let file=path.resolve(root,'.'+pathname);
    if(file!==root && !file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    let stat=await fs.stat(file);
    if(stat.isDirectory()){file=path.join(file,'index.html');stat=await fs.stat(file);}
    if(!stat.isFile())throw new Error('Not found');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size});
    res.end(await fs.readFile(file));
  }catch{
    res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});
    res.end(await fs.readFile(path.join(root,'404.html')).catch(()=>Buffer.from('Run npm run build first.')));
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`History preview: http://127.0.0.1:${server.address().port}`));
