var express = require('express');
var path = require('path');
var session=require('express-session');
var ejs=require('ejs');
var $  = require('jquery');
var dt = require('datatables.net');
var nodemailer=require('nodemailer');
var multer  = require('multer');
var passport = require('passport');
var app = express();



app.use(passport.initialize());
app.use(passport.session());

/**************multer start********************/
const storage = multer.diskStorage(
  {
    destination: './public/uploads/',
    filename: function(req, file,cb)
    {
      cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  const upload = multer(
    {
      storage : storage,
      limits:{fileSize: 1000000},
      fileFilter: function(req,file,cb)
      {
        checkFileType(file,cb);
      }
    }).single('profilePhoto');
function checkFileType(file,cb)
{
  const filetypes = /jpeg|jpg|png|gif/;
  const extname =filetypes.test( path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if(mimetype && extname)
  {
    return cb(null,true);
  }
  else
  {
    cb('Error:Images only!');
  }
}
/**************************multer end*********************/

//Acces static files
app.use(express.static(path.join(__dirname, 'public')));

//set path and view engine
app.set('views', path.join(__dirname, 'Views'));
app.set('view engine', 'ejs');

//Bodyparser
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(session({secret:"Login"}));

//Connect with db
var mongoose = require('mongoose');
var mongoDB = 'mongodb://localhost/test';

mongoose.connect(mongoDB);

mongoose.connection.on('error', (err) => {
    console.log('DB connection Error');
});

mongoose.connection.on('connected', (err) => {
    console.log('DB connected');
});
/**********************users schema********************/
var usersSchema = new mongoose.Schema(
  {
    name: String,
    password: String,
    email: String,
    phone: Number,
    dob: String,
    city: String,
    gender: String,
    role: String,
    status:String,
    flag:String,
    isopen:String,
    path:String,
    commin:[String],
    commreq:[String]
  })
var users =  mongoose.model('user', usersSchema);
/****************************community schema*************************/
var commschema=new mongoose.Schema(
  {
    commbuildname:String,
    commbuild:String,
    commname:String,
    commdescription:String,
    commrule:String,
    commpath:String,
    commlocation:String,
    commdate:String,
    users:[String],
    requested:[String]
  }
);
var comms =  mongoose.model('comms', commschema);

/*************************handle user image req**************************/
app.post('/upload',function(req,res)
{
  upload(req,res,(err)=>
  {
    if(err)
    {
      res.render('firstLogin',
      {
          msg: err
      });
    }
    else
    {
      console.log(req.file);
        if(req.file == undefined)
        {
          res.render('firstLogin',
          {
            msg: 'Error: No File Selected!'
          });
        }
        else
        {
          req.file.path=req.file.path.substr(6);
          users.findOneAndUpdate(
            {
              email:req.session.email
            },
            {
              path:req.file.path,
              isopen:"1",
              status:"confirmed"
            },
            {
              new:true,
              runValidators:true
            }).then(data=>
            {
              if(data!="")
              {
                res.render('firstLogin',
                {
                  msg:'File Uploaded',
                  file:`uploads/${req.file.filename}`
                });
              }
              else
              {
                res.render('firstLogin',
                {
                  msg:'File Not uploaded',
                  file:`default.png`
                })
              }
            }).catch(err=>
            {})
        }
    }
  })
});
/***************** handle add user req****************/
app.post('/add',function (req, res)
{
  console.log(req.body);
  let newuser = new users(
    {
      name:req.body.name,
      email:req.body.email,
      password:req.body.password,
      city:req.body.city,
      dob:req.body.dob,
      gender:req.body.gender,
      phone:req.body.phone,
      role:req.body.role,
      status:"pending",
      flag:"1",
      isopen:"0",
      path:"default.png"
  })
  newuser.save().then(data =>
    {
      console.log(data)
      res.send(data)
   }).catch(err =>
     {
       console.error(err)
       res.send(error)
     })
   });
/*****************handle check login details req******************/
app.post('/check',function (req, res)
{
  users.find(
    {
      email:req.body.email,
      password:req.body.password
    }).then(data =>
      {
        if(data!="")
        {
          console.log(data[0].isopen);
          req.session.isLogin = 1;
          req.session.email = data[0].email;
          req.session.role=data[0].role;
          req.session.name=data[0].name;
          res.send(data);
        }
        else
				res.send("TRY AGAIN");
      }).catch(err =>
        {
          console.error(err)
          res.send(error)
        })
      });
/**************handle updatefromfirstlogin req*******************************/
app.post('/updatefromfirstlogin',function(req,res)
{
  users.findOneAndUpdate(
    {
      email:req.session.email
    },
    {
      phone:req.body.phone,
      city:req.body.city,
      name:req.body.name,
      gender:req.body.gender,
      dob:req.body.dob,
      status:"confirmed",
      isopen:"1"
    },
    {
      new:true,
      runValidators:true
    }).then(data=>{res.send(data);}).catch(err=>{})
});
/**********************handle create community********************/
app.post('/createcomm',function(req,res)
{
  console.log(req.body);
  upload(req,res,(err)=>  {
    if(err){
      res.render('createcommunity',{
          msg: err
      });
    }
    else{
      var ab;
      if(req.file==undefined)
      ab="default.png";
      else
      {
      ab=`uploads/${req.file.filename}`;
    }
  let newcom=new comms({
    commbuildname:req.session.name,
    commname: req.body.communityName,
    commbuild:req.session.email,
    commdescription:req.body.communityDescription,
    commlocation:"NOT SET",
    commrule:req.body.rule,
    commdate:new Date().toISOString().slice(0,10),
    commpath:ab
    })
    newcom.save()
    .then(data=>{
        console.log(data);
        req.session.comid=data._id;
        req.session.comname=data.name;
        res.render("createcommunity");
    })
    .catch(err=>{
        console.log(err);
        res.send(err);
    })
  }
})
});
/*************joincommunity**********/
app.post('/joincomm',function(req,res)
{
  if(req.body.rule=="D")
  {
    comms.findOneAndUpdate(
    {
      _id:req.body.id
    },
    {
      $push:{users:req.session.email}
    },
    {
      new:true,
      runValidators:true
    }).then(data=>
      {
        users.findOneAndUpdate(
          {
            email:req.session.email
          },
          {
            $push:{commin:req.body.id}
          },
          {
            new:true,
            runValidators:true
          }).then(data=>
          {
          }).catch(err=>{});
          res.send(data);
      }).catch(err=>
        {
          console.log(err);
        })
      }
      else
      {
        comms.findOneAndUpdate(
        {
          _id:req.body.id
        },
        {
          $push:{requested:req.session.email}
        },
        {
          new:true,
          runValidators:true
        }).then(data=>
          {
            users.findOneAndUpdate(
              {
                email:req.session.email
              },
              {
                $push:{commreq:req.body.id}
              },
              {
                new:true,
                runValidators:true
              }).then(data=>
              {
              }).catch(err=>{});
              res.send(data);
          }).catch(err=>
            {
              console.log(err);
            })
      }
    })
/***************handle update user details req****************/
app.post('/update',function(req,res)
{
    console.log(req.body);
    users.findOneAndUpdate(
    {
       email: req.body.old // search query
    },
    {
      email:req.body.email,
      city:req.body.city,
      dob:req.body.dob,
      phone:req.body.phone,
      role:req.body.role,
    },
    {
      new: true, // return updated doc
      runValidators: true // validate before update
    }).then(data =>
      {
        req.session.role=data[0].role;
        console.log(data)
        res.send(data)
      }).catch(err =>
        {
          console.log(err)
          res.send(error)
        })
      });
/****************handle changepassword req****************************/
app.post('/changep',function(req,res)
{
  console.log(req.body);
	//console.log(req.session.email);
  users.findOneAndUpdate(
    {
      email: req.session.email,
    },
    {
      password:req.body.newp
    },
    {
      new: true,                       // return updated doc
      runValidators: true              // validate before update
    }).then(data =>
      {
        console.log(data)
        res.send(data)
      }).catch(err =>
        {
          console.error(err)
          res.send(error)
        })
      });
/****************handle user details req*****************/
app.get('/getuser',function(req,res)
{
  console.log(req.session.email);
  users.find(
    {
      email: req.session.email
    }).then(data =>
      {
        console.log(data);
        res.send(data);
      }).catch(err =>
        {
          console.error(err)
          res.send(error)
        })
      });
/*************** handle user list req****************/
app.post('/userlist',function(req,res)
{
  var col=req.body.order[0].column;
  var dir=req.body.order[0].dir;
  var dataCol=
  {
    0:"email",
    1:"phone",
    2:"city",
    3:"status",
    4:"role"
  }
  var dataDir=
  {
    "asc":1,
    "desc":-1
  }
  getdata(dataCol[col],dataDir[dir]);
  function getdata(colname,sortorder)
  {
    var numberOfUsers;
    var x=users.count({},function(err,count)
    {
      console.log('number of users :'+count);
      numberOfUsers=count;
    });
    var start=req.body.start;
    var length=req.body.length;
    var role=req.body.role;
    var status=req.body.status;
    var search=req.body.search.value;
    var findobj={};
    console.log(role,status);
    if(role!="All")
    {
      findobj.role=role;
    }
    else
    {
      delete findobj["role"];
    }
    if(status!="All")
    {
      findobj.status=status;
    }
    else
    {
      delete findobj["status"];
    }
    if(search!='')
    {
      findobj["$or"]= [
      {
        "email": { '$regex' : search, '$options' : 'i' }
      },
      {
        "city": { '$regex' : search, '$options' : 'i' }
      },
      {
        "status": { '$regex' : search, '$options' : 'i' }
      },
      {
        "role": { '$regex' : search, '$options' : 'i' }
      }]
    }
    else
    {
      delete findobj["$or"];
    }
    var length;
    users.find(findobj).then(data=>length=data.length).catch(err=>console.log(err));
    users.find(findobj).skip(parseInt(start)).limit(parseInt(length)).sort({[colname] : sortorder})
    .then(data =>
      {
        res.send({
          "recordsTotal":String(numberOfUsers),
          "recordsFiltered":length,
          "start":parseInt(start),
          "length":parseInt(length),data})
        }).catch(err =>
          {
            console.error(err)
            res.send("error getting info ")
          })
        }
      });
/**************handle community list req*************/
app.post('/communitylist',function(req,res)
{
  var col=req.body.order[0].column;
  var dir=req.body.order[0].dir;
  var dataCol=
  {
    0:"commname",
    1:"commrule",
    2:"Commlocation",
    3:"Commbuildname",
    4:"commdate"
  }
  var dataDir=
  {
    "asc":1,
    "desc":-1
  }
  console.log(dataDir[dir]);
  getdata(dataCol[col],dataDir[dir]);
  function getdata(colname,sortorder)
  {
    var numberOfcomms;
    var x=comms.count({},function(err,count)
    {
      console.log('number of comms :'+count);
      numberOfcomms=count;
    });
    var start=req.body.start;
    var length=req.body.length;
    var rule=req.body.rule;
    var search=req.body.search.value;
    var findobj={};
    console.log(rule);
    if(rule!="All")
    {
      findobj.commrule=rule;
    }
    else
    {
      delete findobj["commrule"];
    }
    if(search!='')
    {
      findobj["$or"]= [
      {
        "commname": { '$regex' : search, '$options' : 'i' }
      }]
    }
    else
    {
      delete findobj["$or"];
    }
    var length;
    comms.find(findobj).then(data=>length=data.length).catch(err=>console.log(err));
    comms.find(findobj).skip(parseInt(start)).limit(parseInt(length)).sort({[colname] : sortorder})
    .then(data =>
      {
        res.send({
          "recordsTotal":String(numberOfcomms),
          "recordsFiltered":length,
          "start":parseInt(start),
          "length":parseInt(length),data})
        }).catch(err =>
          {
            console.error(err)
            res.send("error getting info ")
          })
        }
});
/**************handle activate or deactivate user req*****************************/
app.post('/toggle',function(req,res)
{
  console.log(req.body.username);
  if(req.body.sf=="1")
  {
    users.findOneAndUpdate(
      {
        'email':req.body.username
      },
      {
        flag:"0"
      },
      {
        new:true,
        runValidators:true
      }).then (data=>
        {
          console.log(data);
        }).catch(err=>
          {

          })
        }
        else
        {
          users.findOneAndUpdate(
            {
              'email':req.body.username
            },
            {
              flag:"1"
            },
          {
            new:true,
            runValidators:true
          }).then (data=>
              {
                console.log(data);
              }).catch(err=>
                {

                })
              }
            });
/************ handle email req*****************/
app.post('/sendmail',function(req,res)
{
  let transporter=nodemailer.createTransport(
    {
      service:'gmail',
      secure:false,
      auth:{
        user:'',
        pass:''
      }
});
let mailOptions=
{
  from:'"anshul"<ajindal700@gmail.com>',
  to:req.body.email,
  subject:req.body.sub,
  html: '<html><body>'+req.body.write+'</body></html>',
};
transporter.sendMail(mailOptions,function(error,info)
{
  if(error)
  {
    console.log(error);
  }
  else
  {
    console.log('Email send:'+info.response);
  }
})
});
/*****for adduser mail*********/
app.post('/sendmails',function(req,res)
{
  let transporter=nodemailer.createTransport(
    {
      service:'gmail',
      secure:false,
      auth:{
        user:'',//email id
        pass:''//password
      }
});
let mailOptions=
{
  from:'"anshul"<ajindal700@gmail.com>',
  to:req.body.email,
  subject:req.body.sub,
  html:req.body.write,
};
transporter.sendMail(mailOptions,function(error,info)
{
  if(error)
  {
    console.log(error);
  }
  else
  {
    console.log('Email send:'+info.response);
  }
})
});
/**************handlegetcomms************/
app.get('/getcomms',function(req,res)
{
  comms.find({
    commbuild:{$ne:req.session.email},
    users:{$nin:[req.session.email]},
    requested:{$nin:[req.session.email]}
  }).then(data=>{
    res.send(data);
  }).catch(err=>{res.send(error)});
});
/************getccomm*************/
app.get('/getccomm',function(req,res)
{
  comms.find({commbuild:req.session.email})
  .then(data=>
  {
    res.send(data);
  }).catch(err=>{res.send(err)});
});
/***********get joined comms****************/
app.get('/getjoincomm',function(req,res)
{
  comms.find({users:{$all:[req.session.email]}})
  .then(data=>
  {
    res.send(data);
  }).catch(err=>{res.send(err)});
});
/***********getrequestedcomm*******/
app.get('/getrequestedcomm',function(req,res)
{
  comms.find({requested:{$all:[req.session.email]}})
  .then(data=>
  {
    res.send(data);
  }).catch(err=>{res.send(err)});
});
/*************handlecancelreq********/
app.post('/cancelreq',function(req,res)
{
  comms.findOneAndUpdate(
    {
      _id:req.body.id
    },
    {
      $pull:{requested:req.session.email}
    }).then(data=>
    {
      res.send(data);
    }).catch(err=>{})
});
/***********set id***********/
app.post('/setid',function(req,res)
{
  req.session._id=req.body.id;
  res.send();
});
/*********getownerdetails********/
app.post('/ownerinfo',function(req,res){
  users.find({
    "email":  req.body.email
  })
  .then(data => {
    res.send(data)
  })
  .catch(err => {
    res.send(error)
  })
})
/*************get particular comm details************/
app.get('/getparcommdet',function(req,res)
{
  console.log("789854621"+req.session._id);
  comms.find(
    {
      _id:req.session._id
    }).then(data=>
      {
        console.log("78787878"+data);
        res.send(data);
      }).catch(err=>
        {
          res.send(err)
        });
});
/**********acceptrequest********/
app.post('/accepted',function (req, res)
{
  console.log(req.body.type);
  users.findOneAndUpdate(
    {
       email: req.body.email // search query
    },
    {
      $pull: { commreq:req.body.name  },
      $push: { commin:req.body.name  }
    },
    {
      new: true,                       // return updated doc
      runValidators: true              // validate before update
    })
    .then(data =>
      {
        console.log(data)
        comms.findOneAndUpdate(
          {
            _id: req.body.name // search query
          },
          {

              $pull: { requested: req.body.email },
              $push: { users: req.body.email }
            },
            {
              new: true,                       // return updated doc
              runValidators: true              // validate before update
            })
            .then(data => {
              console.log(data)
              res.send(data)
    })
    .catch(err => {
      console.error(err)
      res.send(error)
    })
        res.send(data)
      }).catch(err => {
        console.error(err)
        res.send(error)
      })
})
/**********rejectrequest*************/
app.post('/rejected',function (req, res)
{
  console.log(req.body.type);
  users.findOneAndUpdate(
    {
       email: req.body.email // search query
    },
    {
      $pull: { commreq:req.body.name  }
    },
    {
      new: true,                       // return updated doc
      runValidators: true              // validate before update
    }).then(data =>
      {
        console.log(data);
        comms.findOneAndUpdate(
          {
            _id: req.body.name // search query
          },
          {
            $pull: { requested: req.body.email },
          },
          {
            new: true,                       // return updated doc
            runValidators: true              // validate before update
          })
    .then(data => {
        console.log(data)

        res.send(data)
      })
      .catch(err => {
        console.error(err)
        res.send(error)
      })

        res.send(data)
      }).catch(err =>
        {
          console.error(err)
          res.send(error)
      });
    });
/****************************************************/
/******************************************************************/
/****************************************************/
app.get('/firstLogin',function(req,res)
{
  res.render('firstLogin');
});

app.get('/homepage',function(req,res)
{
  res.render('homepage');
});
app.get('/adduser',function(req,res)
{
  res.render('adduser');
});
app.get('/list',function(req,res)
{
  res.render('userlist');
});
app.get('/communitylist',function(req,res)
{
  res.render('communitylist');
});
app.get('/userhomepage',function(req,res)
{
  res.render('userhomepage');
});
app.get('/upload',function(req,res)
{
      if(req.session.role=="user")
      res.render('userhomepage');
      else if(req.session.role=="admin")
      res.render('homepage');
      else if(req.session.role=="commuity manager")
      res.render('commhomepage');
});
app.get('/userpassword',function(req,res)
{
	res.render('userpassword');
});
app.get('/usercommpage',function(req,res)
{
	res.render('usercommpage');
});
app.get('/usercommsearchpage',function(req,res)
{
	res.render('usercommsearchpage');
});
app.get('/createcommunity',function(req,res)
{
	res.render('createcommunity');
});
app.get('/community',function(req,res)
{
	res.render('community');
});
app.get('/commcommsearchpage',function(req,res)
{
  res.render('commcommsearchpage');
});
app.get('/commhomepage',function(req,res)
{
  res.render('commhomepage');
});
app.get('/commpassword',function(req,res)
{
	res.render('commpassword');
});
app.get('/password',function(req,res)
{
	res.render('password');
});
app.get('/commprofileinsearch',function(req,res)
{
  res.render('commprofileinsearch');
});
app.get('/usercomprofileinsearch',function(req,res)
{
  res.render('usercomprofileinsearch');
});
app.get('/settings',function(req,res)
{
  res.render('settings');
});
app.get('/memberslist',function(req,res)
{
  res.render('memberslist');
});
app.listen(3000);
