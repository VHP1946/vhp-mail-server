const nodemailer = require('nodemailer');
const path = require('path'),
      fs = require('fs'),
      cheerio = require('cheerio'),
      puppeteer = require('puppeteer');

class VGMailer{
  constructor(nm,account='yourhomereport'){
    this.nodemailer=nm; //object used for mail
    this.transporter; //object used to send

    this.connected=true; //is ready to send

    this.accounts={
      "yourhomereport":{
        user:'YourHomeReport@vogelheating.com',
        pass:'VogelTicketReport!'
      },
      "confirmations":{
        user:'confirmations@vogelheating.com',
        pass:'VogelConfirm!'
      },
      "support":{
        user:'iamsupport@vogelheating.com',
        pass:'Vracing5511!'
      }
    }

    this.mailsettings = this.GETaccount(account); //mail settings for sending
    this.running=false; //is in the middle of sending
    this.runcnt=0; //how many excpected to send
    this.timer=0; //to help space the sending times
    this.maillog={ //track sending failures and succeses
      fails:[],
      success:[]
    };
    this.lastlog={};
    try{
      this.transporter = this.nodemailer.createTransport({
          service:'Outlook365', // Office 365 server
          port: '587',     // secure SMTP
          tls: {
            ciphers:'SSLv3',
            rejectUnauthorized: false
          },
          auth: this.mailsettings
      });
      this.transporter.verify((err,success)=>{
        if(err){return console.log('Mail Setup Fail: ',err)}
        //console.log('Mail Setup..');
        this.connected = true;
      });
    }catch{this.connected=false};
  }

  GETaccount=(name)=>{
    if(this.accounts[name]){return this.accounts[name]}
    return null;
  }

  /* Send Mail
    Sends one piece of mail to an recipent

    mailer:{
        to:'', //email address
        subject:'', //subject for email
        html:'', //content for email
        attachs:[] //of attachments
    }
  */
  SENDmail=(mailer={})=>{
    return new Promise((resolve,reject)=>{
      this.running=true;
      if(this.connected){
        this.transporter.sendMail({
          from:this.mailsettings.user ||'',
          to:mailer.to||'',
          cc:mailer.cc||'',
          bcc:mailer.bcc||'',
          subject:mailer.subject||'',
          html:mailer.html||'',
          attachments:mailer.attachments||[]
        },(err,info)=>{
          if(err){return resolve({msg:err,success:false});}
          else{return resolve({msg:'Mail Sent',success:true});}
        });
      }else{return resolve({msg:'Bad data',success:true});}
    });
  }

  SENDlist=(mailer={},len=0,log=()=>{})=>{
    this.running = true;
    this.runcnt=len;
    if(this.connected){
      setTimeout(()=>{
        this.transporter.sendMail({
          from:this.mailsettings.user ||'',
          to:mailer.to||'',
          subject:mailer.subject||'',
          html:mailer.html||''
        },(err,info)=>{
          if(err){
            //console.log(err);
            this.maillog.fails.push({
              id:mailer.id,
              from:this.mailsettings.user,
              to:mailer.to,
            });
          }else{
            this.maillog.success.push({id:mailer.id,from:this.mailsettings.user,to:mailer.to});
          }
          //console.log(this.runcnt);
          //console.log(this.maillog);
          if(this.checkProgress(this.runcnt)){
            //console.log(this.maillog);
            //console.log("REPORT RUN")
            this.timer=0;
            this.running = false
            log(this.maillog);
            this.maillog={
              success:[],
              fails:[]
            }
          }
        });
      },this.timer);
      this.timer+=180; //jumps to stager (want to minimize the time)
    }
  }

  checkProgress=(len)=>{
    if(len == this.maillog.success.length+this.maillog.fails.length){return true}
    return false;
  }

  ATTACHfiles=(rpack)=>{
    return new Promise((resolve,reject)=>{
      try{var toattach=rpack.attach.length;}catch{return resolve({attachments:[],report:null})}
      var haveattach=0;
      var attachments=[];
      var report={}
      if(toattach!=0){
        for(let x=0,l=toattach;x<l;x++){
          report[rpack.attach[x].filename]={
            success:true,
            error:null
          };

          //may not need to read in the file 
          //fs.readFile(path.join(__dirname,'/templates/temphtml.html'),(err,tmphtml)=>{//read in template html file
          //  if(err){
          //    console.log('ERROR >',err);
          //    report[rpack.attach[x].filename].success=false;
          //    report[rpack.attach[x].filename].err=err;
          //  }else{
              let html = cheerio.load(`
                  <!DOCTYPE html>
                  <html>
                      <head>
                        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                      </head>
                      <body>
                      </body>
                  </html>
              `);// <--take out
              html('head').append(prepCSS(rpack.attach[x].css));//apply all styles
              for(let y=0,ll=rpack.attach[x].html.length;y<ll;y++){ //add all content
                html('body').append(rpack.attach[x].html[y]);
              }

              PRINTpdf(html.html()).then(pdf=>{
                let pdftempfile = path.join(__dirname,`/temppdf/testpdf${String(new Date().getTime())}.pdf`)
                fs.writeFileSync(pdftempfile,pdf);
                console.log('PRINT PDF >',x)
                attachments.push({
                  filename:rpack.attach[x].filename+'.pdf',
                  path:pdftempfile,
                  contentType:rpack.attach[x].contentType && rpack.attach[x].contenType != '' ? rpack.attach[x].contenType:'application/pdf'
                });
                haveattach++;
                if(haveattach===toattach){
                  return resolve({attachments:attachments,report:report})
                }
              });
            //}
          //});
        }
      }else{return resolve({attachments:attachments,report:report})}
    })
  }
}

/*

    top: "0.4in",
    right: "0.4in",
    bottom: "0.4in",
    left: "0.4in"
*/
async function PRINTpdf(html){
  const browser = await puppeteer.launch({
    headless:true,
    args: ['--font-render-hinting=none']
  });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36");

  await page.setContent(html,{waitUntil:'networkidle0'});
  const pdf = await page.pdf({format:'Letter',printBackground:true, margin:{
    top: "0.4in",
    right: "0.4in",
    bottom: "0.4in",
    left: "0.4in"
  }});
  await browser.close();
  return pdf;
}

//css comes in as array
var prepCSS = (css)=>{
  let styles = "<style>";
  for(let x=0,l=css.length;x<l;x++){
    styles+=css[x];
  }
  styles+="</style>";
  return styles;
}
var DynaMail=(pack)=>{
  return new Promise((resolve,reject)=>{
    let resp = {
      success : false,
      msg:'No Pack',
      result:null
    }
    if(pack){
      //check mail pack
      console.log(pack);
      let emailer = new VGMailer(nodemailer,pack.from);//start a mail object
      let emailpack={
        to:pack.to,
        cc:pack.cc||[],
        bcc:pack.bcc||[],
        subject:pack.subject||'',
        html:pack.body||'',
        attachments:[]
      }

      emailer.ATTACHfiles(pack).then(list=>{
        console.log(list)
        if(list.attachments){
          emailpack.attachments=list.attachments;
        }
        console.log('about to  send')
        emailer.SENDmail(emailpack).then(result=>{
          console.log(result);
          resp={
            ...resp,
            success:result.success,
            msg:result.msg,
            result:result.report //not used yet
          }
          //data.pack.report=list.report;
          //data.success = result.success;
          //data.msg = result.msg;
          return resolve(resp);
        })
      })
    }else{return resolve(resp);}
  });
}

module.exports={
  VGMailer,
  DynaMail
}
