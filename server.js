//Libraries used in project
const http = require('http');

const config = require(process.env.CONFIG || './data/vhp-config.json');
let runner = require('./bin/requester.js');
const PORT = process.env.PORT || 7000; //port for local host
let dev = config.dev!=undefined ?config.dev : false; //turn on and off depending if server being run without reverse proxy;

var services = http.createServer();

services.on('request',(req,res)=>{//handle headers =>
    if(req.rawHeaders['Sec-Fetch-Site']!='same-origin'){
      if(dev){//flag to handle cors, change in config file
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
        res.setHeader('Access-Control-Max-Age', 2592000); // 30 days
      }
    }
});

services.on('request',(req,res)=>{
    let data = '';
    req.on('data',chunk=>{data+=chunk;});

    req.on('end',()=>{
        try{data=JSON.parse(data);}catch{data={};}
        console.log('Service Request >',data);
        if(Object.keys(data).length>0){
            runner(req,res,data).then(answr=>{//send to request handler
                console.log('Result >',answr);
                res.write(JSON.stringify(answr));
                res.end();
            });
        }else{//request had no data
            res.write(JSON.stringify({
                success:false,
                msg:'No data was passed to fill request.',
                result:null
            }));
            res.end();
        }
    });
});

services.listen(PORT,()=>{console.log('VAPI Services Listening: ',PORT)});

  