const {Core}=require('vhp-api');

let core = new Core({
    auth:{user:'VOGCH',pswrd:'vogel123'},
    host:'http://3.135.187.89/',
    sync:false,
    client:true,
    dev:{comments:true,https:false}
});



core.SENDrequest({
    pack:{
        to:'christianv@vogelheating.com',
        from:'yourhomereport',
        subject:'TEST',
        body:'<div>THIS IS A TEST</div>',
        attachments:[{
            html:'<div>THIS IS THE TEST FILE</div>',
            filename:'test-file',
            type:'application/json'
        }]
    },
    route:"MAILSERVER",
    request:"MAIL"
}).then(answr=>console.log(answr))
