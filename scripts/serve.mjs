import http from 'node:http';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../_site');
const port=Number(process.env.PORT||8080);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.ico':'image/x-icon','.md':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.mp4':'video/mp4'};
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
    const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'};
    let start=0,end=stat.size-1,code=200;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(match && (match[1] || match[2])){
        start=match[1]?Number(match[1]):Math.max(0,stat.size-Number(match[2]));
        end=match[1]?(match[2]?Math.min(Number(match[2]),end):end):end;
      }else start=stat.size;
      if(start>=stat.size || start>end){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}
      code=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
    }
    headers['Content-Length']=end-start+1;
    res.writeHead(code,headers);
    if(req.method==='HEAD'){res.end();return;}
    const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());stream.pipe(res);
  }catch{
    res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});
    res.end(await fs.readFile(path.join(root,'404.html')).catch(()=>Buffer.from('Run npm run build first.')));
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`History preview: http://127.0.0.1:${server.address().port}`));
