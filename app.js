const express = require("express");
var csrf = require("tiny-csrf");
const app = express();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
// eslint-disable-next-line no-unused-vars
const { Admin, election, question, options, voters } = require("./models");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const flash = require("connect-flash");

app.use(flash());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("shh! some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.set("view engine", "ejs");
// eslint-disable-next-line no-undef
app.set("views", path.join(__dirname, "views"));
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "my-super-secret-key-21728173615375893",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  "admin",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      Admin.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password" });
          }
        })
        .catch((error) => {
          return done(error);
        });
    }
  )
);

passport.use(
  "voter",
  new LocalStrategy(
    {
      usernameField: "voterId",
      passwordField: "password",
    },
    (username, password, done) => {
      voters
        .findOne({ where: { voterId: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid Password" });
          }
        })
        .catch(() => {
          return done(null, false, {
            message: "Id is not valid",
          });
        });
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, { id: user.id, case: user.case });
});
passport.deserializeUser((id, done) => {
  if (id.case === "admin") {
    Admin.findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  } else if (id.case === "voter") {
    voters
      .findByPk(id.id)
      .then((user) => {
        done(null, user);
      })
      .catch((error) => {
        done(error, null);
      });
  }
});

app.get("/", (request, response) => {
  if (request.user) {
    if (request.user.case === "admin") {
      return response.redirect("/election");
    } else if (request.user.case === "voter") {
      request.logout((err) => {
        if (err) {
          return response.json(err);
        }
        response.redirect("/");
      });
    }
  } else {
    response.render("index", {
      title: "Voting Platform",
    });
  }
});
app.get(
  "/index",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("index", {
      title: "Online Voting Platform",
      csrfToken: request.csrfToken(),
    });
  }
);
//for signup
app.get("/signup", (request, response) => {
  try {
    response.render("signup", {
      title: "Create an account",
      csrfToken: request.csrfToken(),
    });
  } catch (err) {
    console.log(err);
  }
});
//for signout
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

app.get("/login", (request, response) => {
  response.render("login", {
    title: "Login",
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/election",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
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
  }
);
app.post("/admin", async (request, response) => {
  if (request.body.email.length == 0) {
    request.flash("error", "Email can,t be empty! Try entering mail address.");
    return response.redirect("/signup");
  }

  if (request.body.firstName.length == 0) {
    request.flash(
      "error",
      "First name cannot be empty! Try entering your name"
    );
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
});

app.get(
  "/creatingElection",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      response.render("createNewElec", {
        title: "Creating new Election",
        csrfToken: request.csrfToken(),
      });
    }
  }
);

app.post(
  "/election",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.elecName.length === 0) {
      request.flash("error", "Election must have a name!");
      return response.redirect("/creatingElection");
    }
    if (request.body.publicurl.length === 0) {
      request.flash("error", "Public Url must be passed");
      return response.redirect("/creatingElection");
    }
    try {
      await election.addElection({
        elecName: request.body.elecName,
        publicurl: request.body.publicurl,
        adminId: request.user.id,
      });
      return response.redirect("/election");
    } catch (error) {
      request.flash("error", "This URL is already taken,try with a new one.");
      return response.redirect("/creatingElection");
    }
  }
);

app.get(
  "/elecs/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const questions = await question.getQuestions(request.params.id);
      const elections = await election.findByPk(request.params.id);
      // eslint-disable-next-line no-unused-vars
      const elecName = await election.getElections(
        request.params.id,
        request.user.id
      );
      const countOfQuestions = await question.countQuestions(request.params.id);
      response.render("elecQuestion", {
        election: elections,
        publicurl: elections.publicurl,
        question: questions,
        id: request.params.id,
        title: elections.elecName,
        countOfQuestions: countOfQuestions,
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/questions/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // eslint-disable-next-line no-unused-vars
    const allElections = await election.getElections(
      request.params.id,
      request.user.id
    );
    const anyQuestion = await question.getQuestions(request.params.id);
    const elections = await election.findByPk(request.params.id);
    if (election.launched) {
      request.flash("error", "Election is running,can't modify a question ");
      return response.redirect(`allElections/${request.params.id}`);
    }
    if (request.accepts("html")) {
      response.render("questions", {
        title: elections.elecName,
        id: request.params.id,
        questions: anyQuestion,
        election: elections,
        csrfToken: request.csrfToken(),
      });
    } else {
      return response.json({ anyQuestion });
    }
  }
);

app.get(
  "/createQuestion/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    response.render("createQuestion", {
      id: request.params.id,
      csrfToken: request.csrfToken(),
    });
  }
);

app.post(
  "/createQuestion/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.body.questionName) {
      request.flash("error", "Question must be created");
      return response.redirect(`/createQuestion/${request.params.id}`);
    }
    try {
      // eslint-disable-next-line no-unused-vars
      const questions = await question.addQuestions({
        elecId: request.params.id,
        questionName: request.body.questionName,
        desc: request.body.desc,
      });
      return response.redirect(
        `/getElections/addingOption/${request.params.id}/${question.id}/options`
      );
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/election/:elecId/questions/:questionId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);
    const electionGoing = await election.findByPk(request.params.elecId);
    const presQuestion = await question.findByPk(request.params.questionId);
    response.render("editQues", {
      userName: admin.name,
      election: electionGoing,
      question: presQuestion,
      csrf: request.csrfToken(),
    });
  }
);

app.post(
  "/election/:elecId/questions/:questionId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.user.case === "admins") {
      try {
        await question.editQuestion(
          request.body.questionName,
          request.body.desc,
          request.params.questionId
        );
        response.redirect(`/questions/${request.params.elecId}`);
      } catch (error) {
        console.log(error);
        return;
      }
    }
  }
);

app.delete(
  "/deletequestion/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // if (request.user.case === "admins") {
    try {
      const res = await question.deleteQuestion(request.params.id);
      return response.json({ success: res === 1 });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
  // }
);

app.get(
  "/getElections/addingOption/:id/:questionId/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const giveQuestion = await question.getQuestion(
        request.params.questionId
      );
      const option = await options.getOptions(request.params.questionId);
      if (request.accepts("html")) {
        response.render("addOption", {
          title: giveQuestion.questionName,
          desc: giveQuestion.desc,
          id: request.params.id,
          questionId: request.params.questionId,
          option,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({
          option,
        });
      }
    } catch (err) {
      return response.status(422).json(err);
    }
  }
);
app.post(
  "/getElections/addingOption/:id/:questionId/options",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.body.optionName) {
      request.flash("error", "Option must be given a name");
      return response.redirect(
        `/getElections/addingOption/${request.params.id}/${request.params.questionId}/options`
      );
    }
    try {
      await options.addingOption({
        optionName: request.body.optionName,
        questionId: request.params.questionId,
      });
      return response.redirect(
        `/getElections/addingOption/${request.params.id}/${request.params.questionId}/options`
      );
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//editing option
app.get(
  "/election/:elecId/questions/:questionId/options/:id/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // if (request.user.case === "admins") {
    const adminId = request.user.id;
    const admin = await Admin.findByPk(adminId);
    const anyElection = await election.findByPk(request.params.elecId);
    const giveQuestion = await question.findByPk(request.params.questionId);
    const option = await options.findByPk(request.params.id);
    response.render("editOption", {
      username: admin.name,
      election: anyElection,
      question: giveQuestion,
      option: option,
      id: request.params.iYd,
      csrf: request.csrfToken(),
    });
    // }
  }
);
//updating option
app.post(
  "/election/:elecId/questions/:questionId/options/:id/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // if (request.user.case === "admins") {
    try {
      await options.editOption(request.body.optionName, request.params.id);
      response.redirect(
        `/getElections/addingOption/${request.params.elecId}/${request.params.questionId}/options`
      );
    } catch (error) {
      console.log(error);
      return;
    }
  }
  // }
);

//deleting option
app.delete(
  "/:id/deleteOption",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const res = await options.deleteOption(request.params.id);
      return response.json({ success: res == 1 });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//get voters
app.get(
  "/voters/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // if (request.user.case === "admins") {
    // eslint-disable-next-line no-unused-vars
    const allElections = await election.getElections(
      request.params.id,
      request.user.id
    );
    const allVoters = await voters.getVoters(request.params.id);
    const elections = await election.findByPk(request.params.id);
    if (request.accepts("html")) {
      response.render("voters", {
        title: election.elecName,
        id: request.params.id,
        voters: allVoters,
        election: elections,
        csrfToken: request.csrfToken(),
      });
    } else {
      return response.json({
        allVoters,
      });
    }
  }
  // }
);
// app.post("")
// add voter
app.get(
  "/addVoter/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // if (request.user.case === "admins") {
    const totalVoters = await voters.getVoters(request.params.id);
    if (request.accepts("html")) {
      response.render("createVoters", {
        id: request.params.id,
        csrfToken: request.csrfToken({ totalVoters }),
      });
    } else {
      return response.json({ totalVoters });
    }
  }
  // }
);
app.post(
  "/addVoter/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // if (request.user.case === "admins") {
    if (request.body.voterId.length == 0) {
      request.flash("error", "Voter ID can't be empty!");
      return response.redirect(`/addVoter/${request.params.id}`);
    }
    if (request.body.password.length == 0) {
      request.flash("error", "Password can't be empty!!");
      return response.redirect(`/addVoter/${request.params.id}`);
    }
    if (request.body.password.length < 4) {
      request.flash("error", "Password length can't be less than 4!");
      return response.redirect(`/addVoter/${request.params.id}`);
    }
    // const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
    try {
      await voters.addVoters(request.body.voterId, request.params.id);
      return response.redirect(`/voters/${request.params.id}`);
    } catch (error) {
      console.log(error);
      request.flash("error", "Voter Id already used, try another!");
      return response.redirect(`/addVoter/${request.params.id}`);
    }
  }
  // }
);
//editvoter
app.get(
  "/election/:elecId/voter/:voterId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // if (request.user.case === "admins") {
    const thisElection = await election.findByPk(request.params.elecId);
    const voter = await voters.findByPk(request.params.voterId);
    response.render("modifyVoters", {
      election: thisElection,
      voter: voter,
      csrf: request.csrfToken(),
    });
  }
  // }
);

app.post(
  "/election/:elecId/voter/:voterId/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    // if (request.user.case === "admins") {
    try {
      await voters.modify(request.params.voterId, request.body.password);
      response.redirect(`/voters/${request.params.elecId}`);
    } catch (error) {
      console.log(error);
      return;
    }
  }
  // }
);
app.delete(
  "/:id/deleteVoter",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const res = await voters.deleteVoter(request.params.id);
      return response.json({ success: res == 1 });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);



app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  async (request, response) => {
    return response.redirect("/election");
  }
);
module.exports = app;
