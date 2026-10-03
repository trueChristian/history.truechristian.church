/** The deployed custom domain supports HTTPS even when Pages reports its old HTTP setting. */
export function siteOrigin(value='https://truechristian.github.io'){
  const parsed=new URL(value);
  if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password||parsed.search||parsed.hash||!['','/'].includes(parsed.pathname))throw new Error('SITE_ORIGIN must be an origin without a path');
  if(parsed.hostname==='history.truechristian.church')parsed.protocol='https:';
  return parsed.origin;
}
