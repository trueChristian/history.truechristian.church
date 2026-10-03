import {searchRecords} from './lib/history.mjs';
let indexPromise;
async function loadIndex(indexURL){
  return indexPromise||=fetch(indexURL).then(response=>{
    if(!response.ok)throw new Error('The search index could not be loaded. Please refresh and try again.');
    return response.json();
  }).catch(error=>{indexPromise=undefined;throw error;});
}
self.onmessage=async event=>{
  const {id,query,filters,indexURL}=event.data;
  try{
    const matches=searchRecords(await loadIndex(indexURL),query,filters);
    // Keep full source text inside the worker; only send result metadata to the page.
    const results=matches.map(({normalized,...metadata})=>metadata);
    self.postMessage({id,results});
  }catch(error){self.postMessage({id,error:error.message});}
};
