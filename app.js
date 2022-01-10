//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const methodOverride = require('method-override')


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(methodOverride('_method'))

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  personals:[
    {
      type: mongoose.Schema.Types.ObjectId,
    ref:"Personal"
    }
  ]
});

const postSchema = {
  title: String,
  content: String,
  comments:[
    {
      type: mongoose.Schema.Types.ObjectId,
    ref:"Comment"
  }
  ]
};

const Post = mongoose.model("Post", postSchema);

// comment schema
const commentSchema = {
  name:String,
  comment: String,
};

const Comment = mongoose.model("Comment", commentSchema);


// personal schema
const personalSchema = {
  title:String,
  content: String,
};

const Personal = mongoose.model("Personal", personalSchema);


userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

// app.get("/personalBlog", function(req, res){
//   if (req.isAuthenticated()){
//     res.render("personalBlog");
//   } else {
//     res.redirect("/login");
//   }
// });


app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  if (req.isAuthenticated()){
    res.render("secrets",{yourName: req.user.username});
  } else {
    res.redirect("/login");
  }
});




app.get("/blog", function(req, res){
  if (req.isAuthenticated()){
    Post.find({}, function(err, posts){
      res.render("blog", {
               posts: posts,
        });
    });

  } else {
    res.redirect("/login");
  }
});


app.get("/personalBlog", function(req, res){
  if (req.isAuthenticated()){
    User.findOne({_id: req.user.id} ).populate('personals').exec(function(err, personals){
      if(err){
        console.log(err);
      }else{
   console.log(personals);
      res.render("personalBlog", {
        user: personals,
      
      });
    };
  });

  } else {
    res.redirect("/login");
  }

});


app.get("/compose", function(req, res){
  res.render("compose");
});

app.post("/compose", function(req, res){
  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody
  });
  post.save(function(err){
    if (!err){
        res.redirect("/blog");
    }
  });
});

// ).populate('comments').exec(


app.get("/posts/:postId", function(req, res){

  const requestedPostId = req.params.postId;
  console.log(requestedPostId);
    Post.findOne({_id: requestedPostId} ).populate('comments').exec(function(err, post){
      if(err){
        console.log(err);
      }else{
// console.log(post);
      res.render("post", {
        title: post.title,
        content: post.content,
        postId:requestedPostId,
        post:post,
      
      });
    };
      // app.post("/delete", function (req, res) {
      //   // console.log(req.params.postId);
      //   Post.findByIdAndDelete({_id: requestedPostId}, function(err){
      //     if(err){
      //       console.log(err);
      //     } else {
      //       console.log("Sucessfully Deleted");
      //       res.redirect("/blog")
      //     }
      //   });
      // });
  
  
      
    });
    
    
  });


  app.get("/personals/:personalId", function(req, res){

    const requestedPostId = req.params.personalId;
    console.log(requestedPostId);
      Personal.findOne({_id: requestedPostId},function(err, personal){
        console.log(personal);
        if(err){
          console.log(err);
        }else{
  console.log(personal);
        res.render("personalPost", {
          title: personal.title,
          content: personal.content,
          id :requestedPostId, 
        
        });
      };
        app.post("/delete", function (req, res) {
          console.log(req.body.del);
          const id = req.body.del;
          // console.log(id);
          Personal.findByIdAndDelete(id, function(err){
            if(err){
              console.log(err); 
            } else {
              console.log("Sucessfully Deleted");
              res.redirect("/personalBlog")
            }
          });
        });
    
    
        
      });
      
      
    });





  
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});


// comment post route

app.post("/posts/:postId/comment",(req, res) => {
  const post = req.params.postId;
// console.log(req.params.postId);
// console.log(req.body.comment);
const commentInput = req.body.comment;


const comment = new Comment({
  name:req.user.username,
  comment:commentInput
});

comment.save(function(err,result){
  if (!err){
    Post.findById(req.params.postId, function(err,post){

      if(!err){
        // console.log(result);
        console.log("========comments=======");
        
        post.comments.push(result);
        // console.log(post.comments);
        post.save();
        
      }
    });
    // console.log(result);
    res.redirect("/posts/"+post);
  }
});
});

app.post("/composePersonal", function(req, res){
  const personal = new  Personal({
    title: req.body.postTitle,
    content: req.body.postBody
  });
  // personal.save(function(err){
  //   if (!err){
  //       res.redirect("/personalBlog");
  //   }
  // });


  personal.save(function(err,result){
    if (!err){
      User.findById(req.user.id, function(err,user){
  
        if(!err){
          // console.log(result);
          console.log("========personalPost=======");
          
          user.personals.push(result);
          // console.log(post.comments);
          user.save();
          
        }
      });
      // console.log(result);
      res.redirect("/personalBlog");
    }
  });

});




app.get("/composePersonal", function(req, res){
  res.render("composePersonal");
});


app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
