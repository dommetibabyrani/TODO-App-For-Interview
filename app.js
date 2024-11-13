const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoapplication.db");
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error : ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const authentication = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken) {
      jwt.verify(jwtToken, "SECRET_KEY", (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.name = payload.name;
          request.id = payload.id;
          next();
        }
      });
    } else {
      response.status(401);
      response.send("Invalid JWT Token");
    }
  };

  //Sign Up
  
  app.post("/register/", async (request, response) => {
    const {name, password, email} = request.body;
    const getUserQuery = `SELECT * FROM user WHERE name = '${name}'`;
    const userDBDetails = await db.get(getUserQuery);
    if (userDBDetails !== undefined) {
      response.status(400);
      response.send("User already exists");
    } else {
      if (password.length < 6) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const createUserQuery = `INSERT INTO user(name,password,email)
         VALUES('${name}','${hashedPassword}','${email}')`;
        await db.run(createUserQuery);
        response.send("User created successfully");
      }
    }
  }); 

  // Login
  app.post("/login/", async (request, response) => {
    const {name, password } = request.body;
    const getUserQuery = `SELECT * FROM user WHERE name='${name}';`;
    const userDbDetails = await db.get(getUserQuery);
    if (userDbDetails !== undefined) {
      const isPasswordCorrect = await bcrypt.compare(
        password,
        userDbDetails.password
      );
      if (isPasswordCorrect) {
        const payload = { name, id: userDbDetails.user_id };
        const jwtToken = jwt.sign(payload, "SECRET_KEY");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid password");
      }
    } else {
      response.status(400);
      response.send("Invalid user");
    }
  });


//Returns a list of all todos whose status is 'TO DO'
app.get("/todos/",authentication, async (request, response) => {
  const {
    status = "",
    priority = "",
    todo = "",
    search_q = "",
  } = request.query;
  let allList;
  if (status === "TO DO") {
    allList = `
    SELECT *
    FROM todo
    WHERE status = '${status}';`;
  } else if (priority === "HIGH" && status === "IN PROGRESS") {
    allList = `
    SELECT *
    FROM todo
    WHERE priority = '${priority}' AND status = '${status}';`;
  } else if (priority === "HIGH") {
    allList = `
      SELECT *
      FROM todo
        WHERE priority = '${priority}';`;
  } else if (search_q === "Play") {
    allList = `
    SELECT *
    FROM todo
    WHERE todo LIKE '%${search_q}%';`;
  }
  const finalList = await db.all(allList);
  response.send(finalList);
});
//Returns a specific todo based on the todo ID
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodo = `
    SELECT *
    FROM todo
    WHERE id = ${todoId};`;
  const newTodo = await db.get(getTodo);
  response.send(newTodo);
});
//Create a todo in the todo table
app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status } = todoDetails;
  const createTodo = `
    INSERT INTO 
        todo(id,todo,priority,status)
    VALUES (${id},'${todo}','${priority}','${status}');`;
  await db.run(createTodo);
  response.send("Todo Successfully Added");
});
//Update a Todo
app.put("/todos/:todoId/", async (request, response) => {
  const todoDetails = request.body;
  const { id = "", todo = "", priority = "", status = "" } = todoDetails;
  const { todoId } = request.params;
  let updateTodo;
  if (status !== "") {
    updateTodo = `
        UPDATE 
         todo 
        SET 
        status = '${status}'
        WHERE id = ${todoId};`;
    await db.run(updateTodo);
    response.send("Status Updated");
  } else if (priority !== "") {
    updateTodo = `
        UPDATE 
         todo 
        SET 
        priority = '${priority}'
        WHERE id = ${todoId};`;
    await db.run(updateTodo);
    response.send("Priority Updated");
  } else if (todo !== "") {
    updateTodo = `
        UPDATE 
         todo 
        SET 
        todo = '${todo}'
        WHERE id = ${todoId};`;
    await db.run(updateTodo);
    response.send("Todo Updated");
  }
});
//Deletes a todo from the todo table based on the todo ID
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodo = `
    DELETE FROM todo
    WHERE id = ${todoId};`;
  await db.run(deleteTodo);
  response.send("Todo Deleted");
});

//Get Profile Api
app.get("/profile/",authentication, async (request, response) => {
    let {name} = request;
    const selectUserQuery = `SELECT * FROM user WHERE name='${name}';`;
    const dbUser = await db.get(selectUserQuery);
    response.send(dbUser);
});

module.exports = app;