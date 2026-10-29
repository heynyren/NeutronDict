/* This trusted extension document is also the existing PDF worker host. */
let posWorker, posNext=0, posIdle;
const posWaiting=new Map();
function stopPosWorker(){
  posWorker?.terminate();posWorker=null;
  for(const {resolve,timer} of posWaiting.values()){clearTimeout(timer);resolve({ok:false,error:"POS worker stopped"});}
  posWaiting.clear();
}
function analyzePos(rows){
  clearTimeout(posIdle);
  if(!posWorker){
    posWorker=new Worker("pos-worker.js");
    posWorker.onmessage=({data})=>{
      const pending=posWaiting.get(data.id);if(!pending)return;
      posWaiting.delete(data.id);clearTimeout(pending.timer);pending.resolve(data);
      if(!posWaiting.size)posIdle=setTimeout(stopPosWorker,60000);
    };
    posWorker.onerror=stopPosWorker;
  }
  return new Promise(resolve=>{
    const id=++posNext,timer=setTimeout(()=>{stopPosWorker();},30000);
    posWaiting.set(id,{resolve,timer});posWorker.postMessage({id,rows});
  });
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
  if(msg.target!=="pos-offscreen"||msg.type!=="POS_ANALYZE"||sender.id!==chrome.runtime.id)return;
  if(!Array.isArray(msg.rows)||msg.rows.length>8||msg.rows.some(r=>typeof r?.text!=="string"||r.text.length>2000)||
     msg.rows.reduce((n,r)=>n+r.text.length,0)>6000){respond({ok:false,error:"Invalid subtitle batch"});return;}
  analyzePos(msg.rows).then(respond);return true;
});
