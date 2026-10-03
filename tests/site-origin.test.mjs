import test from 'node:test';
import assert from 'node:assert/strict';
import {siteOrigin} from '../src/lib/site-origin.mjs';
test('production canonicals use the verified HTTPS custom domain',()=>{
 assert.equal(siteOrigin('http://history.truechristian.church'),'https://history.truechristian.church');
 assert.equal(siteOrigin('https://history.truechristian.church/'),'https://history.truechristian.church');
 assert.equal(siteOrigin('http://127.0.0.1:8080'),'http://127.0.0.1:8080');
 assert.equal(siteOrigin('https://history.example.test'),'https://history.example.test');
 for(const invalid of ['https://example.test/path','https://a:b@example.test','javascript:alert(1)'])assert.throws(()=>siteOrigin(invalid));
});
