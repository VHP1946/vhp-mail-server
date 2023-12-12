const {DynaMail} = require('./mailing/vhc-mail-service.js');

/*

                req:req,
                res:res,
                data:data,
                routes:config.upstreams || []

                */


module.exports=(req,res,data)=>{
    return new Promise((resolve,reject)=>{
        switch(data.access.request.toUpperCase()){
            case 'MAIL':{
                console.log('Mail Service');
                return resolve(DynaMail(data));
            }
            default:{
                return resolve({success:false,msg:'bad request'})
            }
        }

    });
}
