const request = require("supertest");
var cheerio = require("cheerio");

const db = require("../models/index");
const app = require("../app");

let server, agent ;
function extractCsrfToken(res){
    var $ = cheerio.load(res.text);
    return $("[name=_csrf]").val();
}
describe("test suite",()=>{
    beforeAll(async () =>{
        await db.sequelize.sync({force:true});
        server = app.listen(3000,()=>{});
        agent = request.agent(server);
    })
    afterAll(async () =>{
        await db.sequelize.close();
        server.close();
    })
    test("first",async() =>{
        expect(true).toBe(true)
    })
})