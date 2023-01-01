const request = require("supertest");
var cheerio = require("cheerio");

const db = require("../models/index");
const app = require("../app");

const { response } = require("../app");
let server, agent;
function extractCsrfToken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}
const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("test suite", () => {
  beforeAll(async () => {
    server = app.listen(6000, () => {});
    agent = request.agent(server);
  });
  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });
  test("Sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/admin").send({
      firstName: "Pavan",
      lastName: "Kumar",
      email: "kumar@gmail.com",
      password: "12345678",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("User login", async () => {
    res = await agent.get("/election");
    expect(res.statusCode).toBe(200);
    await login(agent, "kumar@gmail.com", "12345678");
    res = await agent.get("/election");
    expect(res.statusCode).toBe(200);
  });

  test("Sign out", async () => {
    let res = await agent.get("/election");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/election");
    expect(res.statusCode).toBe(302);
  });

  test("Creating an election", async () => {
    const agent = request.agent(server);
    await login(agent, "kumar@gmail.com", "12345678");
    let res = await agent.get("/creatingElection");
    let csrf = extractCsrfToken(res);
    const response = await agent.post("/election").send({
      elecName: "Class Monitor Elections",
      publicurl: "abc.gs",
      _csrf: csrf,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Adding a question to an election", async () => {
    const agent = request.agent(server);
    await login(agent, "kumar@gmail.com", "12345678");

    let res = await agent.get("/creatingElection");
    let csrf = extractCsrfToken(res);
    await agent.post("/election").send({
      elecName: "captain",
      publicurl: "one",
      _csrf: csrf,
    });
    const groupedResponse = await agent
      .get("/election")
      .set("Accept", "Application/json");
    const parsedResponse = JSON.parse(groupedResponse.text);
    console.log(parsedResponse);
    const allElections = parsedResponse.list_of_elections.length;
    const latestElection = parsedResponse.list_of_elections[allElections - 1];

    res = await agent.get(`/createQuestion/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    res = await agent.post(`/createQuestion/${latestElection.id}`).send({
      questionName: "Y are you selecting",
      desc: "Vote",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Modifying a question", async () => {
    const agent = request.agent(server);
    await login(agent, "kumar@gmail.com", "12345678");

    let res = await agent.get("/creatingElection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      elecName: "PET Post",
      publicurl: "mysite",
      _csrf: csrfToken,
    });
    const groupedResponse = await agent
      .get("/election")
      .set("Accept", "Application/json");
    const parsedGroupedResponse = JSON.parse(groupedResponse.text);
    const electionCount = parsedGroupedResponse.list_of_elections.length;
    const latestElection =
      parsedGroupedResponse.list_of_elections[electionCount - 1];

    res = await agent.get(`/createQuestion/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createQuestion/${latestElection.id}`).send({
      questionName: "select your teacher",
      desc: "on your wish",
      _csrf: csrfToken,
    });
    const status = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedquestionGroupedResponse = JSON.parse(status.text);
    const totalQuestions = parsedquestionGroupedResponse.anyQuestion.length;
    const latestQuestion =
      parsedquestionGroupedResponse.anyQuestion[totalQuestions - 1];

    res = await agent.get(
      `/election/${latestElection.id}/questions/${latestQuestion.id}/edit`
    );
    csrfToken = extractCsrfToken(res);
    res = await agent
      .post(
        `/election/${latestElection.id}/questions/${latestQuestion.id}/edit`
      )
      .send({
        _csrf: csrfToken,
        questionName: "Teacher Post",
        desc: "2nd year",
      });
    expect(res.statusCode).toBe(302);
  });

  test("Deleting a question", async () => {
    const agent = request.agent(server);
    await login(agent, "kumar@gmail.com", "12345678");

    let res = await agent.get("/creatingElection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      elecName: "For science",
      publicurl: "science.co",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/election")
      .set("Accept", "Application/json");
    const parsedResponse = JSON.parse(ElectionsResponse.text);
    const allElections = parsedResponse.list_of_elections.length;
    const latestElection = parsedResponse.list_of_elections[allElections - 1];

    res = await agent.get(`/createQuestion/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createQuestion/${latestElection.id}`).send({
      questionName: "Whom do uh select?",
      desc: "selecting any one of four",
      _csrf: csrfToken,
    });
    res = await agent.get(`/createQuestion/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createQuestion/${latestElection.id}`).send({
      questionName: "Reason for selecting?",
      desc: "telling why!",
      _csrf: csrfToken,
    });

    const groupedResponse = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedquestionsGroupedResponse = JSON.parse(groupedResponse.text);
    const questionCount = parsedquestionsGroupedResponse.anyQuestion.length;
    const latestQuestion =
      parsedquestionsGroupedResponse.anyQuestion[questionCount - 1];

    res = await agent.get(`/questions/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    const deleteResponse = await agent
      .delete(`/deletequestion/${latestQuestion.id}`)
      .send({
        _csrf: csrfToken,
      });
    console.log(deleteResponse.text);
    const parsedDeleteResponse = JSON.parse(deleteResponse.text);
    expect(parsedDeleteResponse.success).toBe(true);
    res = await agent.get(`/questions/${latestQuestion.id}`);
    csrfToken = extractCsrfToken(res);

    const deleteResponse2 = await agent
      .delete(`/deletequestion/${latestElection.id}`)
      .send({
        _csrf: csrfToken,
      });
    const parsedDeleteResponse2 = JSON.parse(deleteResponse2.text).success;
    expect(parsedDeleteResponse2).toBe(false);
  });

  test("Adding option", async () => {
    const agent = request.agent(server);
    await login(agent, "kumar@gmail.com", "12345678");

    let res = await agent.get("/creatingElection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      elecName: "another election",
      publicurl: "elec.co",
      _csrf: csrfToken,
    });
    const getElecRes = await agent
      .get("/election")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(getElecRes.text);
    const allElections = parsedGroupedResponse.list_of_elections.length;
    const latestElection =
      parsedGroupedResponse.list_of_elections[allElections - 1];

    res = await agent.get(`/createQuestion/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createQuestion/${latestElection.id}`).send({
      questionName: "for captain of cricket team",
      desc: "selecting captain",
      _csrf: csrfToken,
    });
    const getQuesRes = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const groupedResponse = JSON.parse(getQuesRes.text);
    const totalQuestions = groupedResponse.anyQuestion.length;
    const latestQuestion = groupedResponse.anyQuestion[totalQuestions - 1];

    res = await agent.get(
      `/getElections/addingOption/${latestElection.id}/${latestQuestion.id}/options`
    );
    csrfToken = extractCsrfToken(res);

    res = await agent
      .post(
        `/getElections/addingOption/${latestElection.id}/${latestQuestion.id}/options`
      )
      .send({
        _csrf: csrfToken,
        optionName: "Option",
      });
    expect(res.statusCode).toBe(302);
  });

  test("Deleting an option", async () => {
    const agent = request.agent(server);
    await login(agent, "kumar@gmail.com", "12345678");

    let res = await agent.get("/creatingElection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      elecName: "new election",
      publicurl: "new",
      _csrf: csrfToken,
    });
    const Response = await agent
      .get("/election")
      .set("Accept", "application/json");
    const parsedElectionsResponse = JSON.parse(Response.text);
    const totalElections = parsedElectionsResponse.list_of_elections.length;
    const latestElection =
      parsedElectionsResponse.list_of_elections[totalElections - 1];

    res = await agent.get(`/createQuestion/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createQuestion/${latestElection.id}`).send({
      questionName: "New Question",
      descr: "description",
      _csrf: csrfToken,
    });
    const QResponse = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(QResponse.text);
    const totalQuestions = parsedGroupedResponse.anyQuestion.length;
    const latestQuestion = parsedGroupedResponse.anyQuestion[totalQuestions - 1];

    res = await agent.get(
      `/getElections/addingOption/${latestElection.id}/${latestQuestion.id}/options`
    );
    csrfToken = extractCsrfToken(res);
    res = await agent
      .post(
        `/getElections/addingOption/${latestElection.id}/${latestQuestion.id}/options`
      )
      .send({
        _csrf: csrfToken,
        optionName: "Done",
      });

    const OpResponse = await agent
      .get(
        `/getElections/addingOption/${latestElection.id}/${latestQuestion.id}/options`
      )
      .set("Accept", "application/json");
    const parsedoptionGroupedResponse = JSON.parse(OpResponse.text);
    const totalOptions = parsedoptionGroupedResponse.option.length;
    const latestOption = parsedoptionGroupedResponse.option[totalOptions - 1];
    res = await agent.get(
      `/election/${latestElection.id}/questions/${latestQuestion.id}/options/${latestOption.id}/edit`
    );
    csrfToken = extractCsrfToken(res);

    res = await agent
      .post(
        `/election/${latestElection.id}/questions/${latestQuestion.id}/options/${latestOption.id}/edit`
      )
      .send({
        _csrf: csrfToken,
        optionName: "Jack",
      });
    expect(res.statusCode).toBe(302);
  });


  test("Deleting an option", async () => {
    const agent = request.agent(server);
    await login(agent, "kumar@gmail.com", "12345678");

    let res = await agent.get("/creatingElection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      elecName: "new election",
      publicurl: "new",
      _csrf: csrfToken,
    });
    const Response = await agent
      .get("/election")
      .set("Accept", "application/json");
    const parsedElectionsResponse = JSON.parse(Response.text);
    const totalElections = parsedElectionsResponse.list_of_elections.length;
    const latestElection =
      parsedElectionsResponse.list_of_elections[totalElections - 1];

    res = await agent.get(`/createQuestion/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    await agent.post(`/createQuestion/${latestElection.id}`).send({
      questionName: "New Question",
      descr: "description",
      _csrf: csrfToken,
    });
    const QResponse = await agent
      .get(`/questions/${latestElection.id}`)
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(QResponse.text);
    const totalQuestions = parsedGroupedResponse.anyQuestion.length;
    const latestQuestion = parsedGroupedResponse.anyQuestion[totalQuestions - 1];

    res = await agent.get(
      `/getElections/addingOption/${latestElection.id}/${latestQuestion.id}/options`
    );
    csrfToken = extractCsrfToken(res);
    res = await agent
      .post(
        `/getElections/addingOption/${latestElection.id}/${latestQuestion.id}/options`
      )
      .send({
        _csrf: csrfToken,
        optionName: "Done",
      });

    const OpResponse = await agent
      .get(
        `/getElections/addingOption/${latestElection.id}/${latestQuestion.id}/options`
      )
      .set("Accept", "application/json");
    const parsedoptionGroupedResponse = JSON.parse(OpResponse.text);
    const totalOptions = parsedoptionGroupedResponse.option.length;
    const latestOption = parsedoptionGroupedResponse.option[totalOptions - 1];
    res = await agent.get(
      `/getElections/addingOption/${latestElection.id}/${latestQuestion.id}/options`
    );
    csrfToken = extractCsrfToken(res);
    const deleteResponse = await agent
      .delete(`/${latestOption.id}/deleteOption`)
      .send({
        _csrf: csrfToken,
      });
    const DeleteResponse = JSON.parse(deleteResponse.text).success;
    expect(DeleteResponse).toBe(true);

    res = await agent.get(
      `/getElections/addingOption/${latestElection.id}/${latestQuestion.id}/options`
    );
    csrfToken = extractCsrfToken(res);
    const res2 = await agent
      .delete(`/${latestOption.id}/deleteOption`)
      .send({
        _csrf: csrfToken,
      });
    const res3 = JSON.parse(res2.text).success;
    expect(res3).toBe(false);
  });

  test("Test for adding a voter", async () => {
    const agent = request.agent(server);
    await login(agent, "kumar@gmail.com", "12345678");

    let res = await agent.get("/creatingElection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      elecName: "For Your Lecturer",
      publicurl: "my-site.in",
      _csrf: csrfToken,
    });
    const groupedResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    const parsedResponse = JSON.parse(groupedResponse.text);
    const totalElections = parsedResponse.list_of_elections.length;
    const latestElection = parsedResponse.list_of_elections[totalElections - 1];
    res = await agent.get(`/addVoter/${latestElection.id}`);
    csrfToken = extractCsrfToken(res);
    let response = await agent.post(`/AddVoter/${latestElection.id}`).send({
      voterId: "Pavan",
      password: "1234",
      elecId: latestElection.id,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  
  test("Test for previewing election", async () => {
    const agent = request.agent(server);
    await login(agent, "kumar@gmail.com", "12345678");
    let res = await agent.get("/creatingElection");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/election").send({
      elecName: "New Election",
      publicurl: "URL",
      _csrf: csrfToken,
    });
    const ElectionsResponse = await agent
      .get("/election")
      .set("Accept", "application/json");
    const parsedResponse = JSON.parse(ElectionsResponse.text);
    const totalElections = parsedResponse.list_of_elections.length;
    const latestElection = parsedResponse.list_of_elections[totalElections - 1];
    res = await agent.get(`/election/${latestElection.id}/sampleElection`);
    csrfToken = extractCsrfToken(res);
    expect(res.statusCode).toBe(200);
  });
});
