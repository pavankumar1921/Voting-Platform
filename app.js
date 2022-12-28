const express = require('express')
var csrf = require('tiny-csrf');
const app = express()
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const path = require("path");
const {Admin,election} = require("./models")
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require('bcrypt')
const saltRounds = 10;
const flash = require("connect-flash")

app.use(flash())
app.use(bodyParser.json())
app.use(express.urlencoded({extended: false}))
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long",["POST","PUT","DELETE"]));

app.set("view engine","ejs");
// eslint-disable-next-line no-undef
app.set("views",path.join(__dirname,'views'))
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname,"public")))

app.use(session({
    secret: "my-super-secret-key-21728173615375893",
    resave:false,
    saveUninitialized:true,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
    }
}))

app.use(function(request,response,next){
    response.locals.messages = request.flash();
    next();
})
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
    usernameField: "email",
    passwordField: "password",
}, (username, password, done) =>{
    Admin.findOne({where: { email: username} })
        .then(async(admin)=>{
            const result = await bcrypt.compare(password,admin.password)
            if (result){
                return done(null,admin)
            }else{
                return done(null,false,{message:"Invalid Password"})
            }
        }).catch((error)=>{
            return done(error)
        })
}))

passport.serializeUser((user, done) => {
    done(null, user.id);
  });
passport.deserializeUser((id, done) => {
    Admin.findByPk(id)
    .then((user)=>{
        done(null,user)
    })
    .catch(error=>{
        done(error,null)
    })
})

app.get("/",(request,response) =>{
    response.render('index');
})
app.get("/signup",(request,response)=>{
    response.render("signup",{
        title: "Signup",
        csrfToken: request.csrfToken()
    })
})
app.get("/login", (request, response) => {
    response.render("login", {
        title: "Login",
        csrfToken: request.csrfToken()
    });
});


app.get("/election",connectEnsureLogin.ensureLoggedIn(), async (request,response)=>{
  let user = await Admin.findByPk(request.user.id);
  const userName = user.dataValues.firstName;
  const list_of_elections = await election.getElections(request.user.id);
  if (request.accepts("html")) {
    response.render("election", {
      title: "Voting Platform",
      userName,
      list_of_elections,
    });
  } else {
    return response.json({
      list_of_elections,
    });
  }
})
app.use(function(request,response,next){
    response.locals.messages = request.flash();
    next();
})
app.post("/admin",async (request,response)=>{
    if (request.body.email.length == 0) {
        request.flash("error", "Email can,t be empty! Try entering mail address.");
        return response.redirect("/signup");
      }
    
      if (request.body.firstName.length == 0) {
        request.flash("error", "First name cannot be empty! Try entering your name");
        return response.redirect("/signup");
      }
      if (request.body.password.length < 8) {
        request.flash("error", "Password length should be minimun of 8 characters");
        return response.redirect("/signup");
      }
    const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
    try {
        const user = await Admin.create({
          firstName: request.body.firstName,
          lastName: request.body.lastName,
          email: request.body.email,
          password: hashedPwd,
        });
        request.login(user, (err) => {
          if (err) {
            console.log(err);
            response.redirect("/");
          } else {
            response.redirect("/election");
          }
        });
      } catch (error) {
        console.log(error);
        // request.flash("error", "User Already Exist with this mail!");
        return response.redirect("/signup");
      }
})
app.get("/signout",(request, response,next) => {
    request.logout((err) => {
      if (err) {
        return next(err);
      }
      response.redirect("/");
    });
  });

app.post("/session",passport.authenticate('local',{failureRedirect: "/login",failureFlash:true}),
async(request,response)=>{
    return response.redirect("/election")
})
module.exports = app;