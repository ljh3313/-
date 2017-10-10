
const exp = require('express');
const fs = require('fs');
const bodyParser=require('body-parser')
const app = exp();
const cookie=require('cookie-parser')
app.use(exp.static('wwwroot'));
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookie());
const multer=require('multer')
// ------注册----------
app.post('/user/register',(req,res)=>{
    var filename=`user/${req.body.username}.txt`;

    function writeFile(){
        fs.exists(filename,(exists)=>{
            if(exists){
                // 该用户已经被注册
                res.status(200).json({
                    code:1,
                    msg:'该用户已被注册'
                })
            }else{
                req.body.time=Date.now();
                req.body.ip=req.ip;
                fs.appendFile(filename,JSON.stringify(req.body),function(error){
                    if(error){
                        res.status(200).json({
                            code:0,
                            msg:'注册失败'
                        })
                    }else{
                        res.status(200).json({
                            code:2,
                            msg:'注册成功'
                        })
                    }
                })
            }
        })
    }
    fs.exists('user',(exists)=>{
        if(exists){
            // 写入
            writeFile();
        }else{
            fs.mkdir('user',(error)=>{
                if(error){
                    res.status(200).json({
                        code:0,
                        msg:'用户文件创建失败'
                    })
                }else{
                    // 写入
                    writeFile();
                }
            })
        }
    })
})
// -------登录-------
app.post('/user/login',(req,res)=>{
    // 根据用户名去匹配user文件中的文件
    var filename=`user/${req.body.username}.txt`
    // 判断文件是否存在
    fs.exists(filename,(exists)=>{
        if(exists){
            // 该用户是注册过的,开始对比密码
            fs.readFile(filename,(error,data)=>{
                if(!error){
                    var user =JSON.parse(data) ;
                    if(user.psw==req.body.psw){
                        // 将用户名存入cookie中
                        var expires=new Date();
                        expires.setMonth(expires.getMonth()+1);
                        res.cookie('username',req.body.username,{expires});
                        // 登陆成功
                        res.status(200).json({
                            code:1,
                            msg:'登录成功'
                        })
                       
                    }else{
                    res.status(200).json({
                            code:2,
                            msg:'密码错误!'
                        })
                }
                }else{
             res.status(200).json({
                            code:3,
                            msg:'文件读取失败!'
               })
        }
            })
        }else{
           res.status(200).json({
                         code:4,
                        msg:'您还未注册'
               }) 
        }
    })
})
// ---------提问-------
app.post('/user/ask',(req,res)=>{
    if(req.cookies.username){
    //    将获取到的问题存入到question 文件夹中

// 封装一个写入的函数
function writeFile(){
    // 文件的名字
    var filename =`question/${Date.now()}.txt`;
    req.body.username=req.cookies.username;
    req.body.time=Date.now();
    req.body.ip=req.ip;
    fs.writeFile(filename,JSON.stringify(req.body),(error)=>{
        if(error){
            res.status(200).json({
                code:2,
                msg:'提问失败'
            })
        }else{
           var img=`upload/${req.body.username}.jpg`
           var src=fs.readFileSync(img)
            res.status(200).json({
                code:1,
                msg:'提问成功',
                ask:JSON.stringify(req.body),
                imgs:src
            })
        }
    })
}

    fs.exists('question',(exists)=>{
        if(exists){
            // 写入
            writeFile()
        }else{
            fs.mkdir('question',(error)=>{
                if(!error){
                    // 写入
              writeFile();
                }
            })
        }

    })
    }else{
        res.status(200).json({
            code:0,
            msg:'登录异常,请重新登录'
        })
        return;
    }
})
// -------退出登录-------
app.get('/user/out',(req,res)=>{
    res.clearCookie('username');
    res.status(200).json({
        code:1,
        msg:'退出成功'
    })
})
// --------个人资料-------

// 配置基本信息
 var storage=multer.diskStorage({
    destination:'./wwwroot/upload',
    filename:function(req,file,callback){
        var filename=file.originalname.split('.')
        callback(null,req.cookies.username+'.'+filename[filename.length-1])
    }
})

// 根据配置信息创建multer对象
var upload=multer({storage})
app.post('/user/upload',upload.single('file'),(req,res)=>{
    res.status(200).json({
        msg:'图片上传成功',
    })
})
// ---------首页------
app.get('/user/all',(req,res)=>{
    fs.readdir('question',(error,files)=>{
        // console.log(file)
        if(!error){
            // 反序
            files=files.reverse();
            var questions=[]
            // 创建一个数组,将每个读取到 的文件内容转为一个对象存到这个数组中
            // 第一种:
        //    for (var i = 0; i < files.length; i++) {
        //         var file=files[i];
        //        var filename='question/'+file;
        //     //    readFile是异步读取文件,不会影响for循环,for循环完了,文件还没有读取完,导致数组没有数据
        //     //   readFileSync同步的读取数据,没有回调函数
        //     var data=   fs.readFileSync(filename)
        //            var obj=JSON.parse(data)
        //            questions.push(obj);
        //         //  console.log(questions)
        //    }
        //  res.status(200).json(questions);  
        // 第二种:递归方式
        var i=0;
        function readFile(){
            if(i<files.length){
                var file=files[i];
                var filename='question/'+file;
                fs.readFile(filename,(error,data)=>{
                    if(!error){
                      var obj=JSON.parse(data);
                      questions.push(obj);
                      i++;
                      readFile();
                    }
                })
            }else{
                // 代表文件已经读取完毕
                res.status(200).json(questions);    
            }
        }
        readFile()
           
        }
    })
})
// --------回答------
app.post('/user/answer',(req,res)=>{
    // 取出question
    var question =req.cookies.question;
    // 根据question找到要回复的是哪个问题
    var filename='question/'+question+'txt';
    // 读取内容
    fs.readFile(filename,(error,data)=>{
        if(!error){
         var obj=JSON.parse(data);
         if(!obj.answer){
             obj.answer=[];
         }else{
            //  存在,将内容存入
            req.body.ip=req.ip;
            req.body.time=Date.now();
            req.body.username=req.cookies.username;
            
         }
        obj.answer.push(req.body);
        // console.log(obj.answer)
        }
    // 修改后要重新写入
    fs.writeFile(filename,JSON.stringify(obj),(error)=>{
        if(!error){
            res.status(200).json({
                msg:'回答成功',
                code:1
            })
        }else{
            res.status(200).json({
                msg:'回答失败',
                code:2
            })
        }
    })
    })
})
app.listen(3000, function () {
    console.log('开始获取访问量......');
})