// TODO: make all the data safe before insert or update

module.exports = function (express, app, path, bcrypt, dbClient) {

	app.use(express.static(path.join(__dirname, "../public")));

	function checkAuth(req, res, next){
		//console.log(req.url);
		var privatePages = [/*"/",*/ "/polls/", "/poll/create/", "/poll/edit/", "/poll/delete/", "/option/create/"];
		if ((privatePages.indexOf(req.url) > -1 || privatePages.indexOf(req.url+"/") > -1 )&& (!req.session || !req.session.authenticated)) {
			res.redirect("/login");
		} else {
			next();
		}
	}

	app.use(function(req, res, next) {
      res.locals.user = req.session.user;
      next();
    });

	app.get("/", /*checkAuth,*/ function (req, res, next) {
		var user;
		if(req.session.authenticated){
			user = req.session.user;
		}
		var userId = req.session.user;

		// TODO: pagination
		var polls = [];
		dbClient.query("select * from polls where status = true order by published desc limit 20", (err, result) => { // TODO: published only
			if (err){
				console.log("Error find polls: " + err);
				// if no polls, you still can see empty list
				res.render("index", {"user" : user, "polls" : polls});
			} else {
				polls = result.rows;
				res.render("index", {"user" : user, "polls" : polls});
			}
		});
    });

    app.get("/registration", function (req, res, next) {
        res.render("registration", {"status" : 0 , "message" : "Please, enter username and password!"});
    });

    app.post("/registration", function (req, res, next) {
		dbClient.query("create table if not exists users(id serial primary key, username varchar(40) not null, password varchar(65) not null)", (err, result) => {
			if (err){
				console.log("Error create table: " + err);
			} else {
				var userName = req.body.username.trim();
				if(userName !=""){
					dbClient.query("select id from users where username = '" + userName + "'", (err, result) => {
						if (err){
							console.log("Error find user: " + err);
							res.render("login", {"errorMessage" : "Error check if user exists."});
						} else {
							if(result.rows.length >0){
								res.render("registration", {"status" : 0 , "message" : "This username is already exists!"});
							} else { // ok
								bcrypt.hash(req.body.password, 10, function(err, passHash) {
									dbClient.query("insert into users (username, password) values ('"+ userName + "', '"+ passHash + "')", (err, result) => {
										if (err){
											console.log("Error insert user: " + err);
										} else {
											res.render("registration", {"status" : 1, "message" : "Thank you for registration!"});
										}
									});
								});
							}
						}
					});
				} else {
					res.render("registration", {"status" : 0 , "message" : "Username should not be empty!"});
				}
			}
		});
    });

	app.get("/login", function (req, res, next) {
    	res.render("login", {"errorMessage" : ""});
   	});

   	app.post("/login", function (req, res, next) {

   		var userName = req.body.username ? req.body.username : "";
   		var password = req.body.password ? req.body.password : "";
   		dbClient.query("select id, password from users where username = '" + userName + "'", (err, result) => {
			if (err){
				console.log("Error find user: " + err);
				res.render("login", {"errorMessage" : "Username is not found."});
			} else {
				if(result.rows.length == 1){
					var hash = result.rows[0]["password"];
					bcrypt.compare(password, hash, function(err, resultComparePass) {
						if(resultComparePass) {
							req.session.user = result.rows[0]["id"];
							req.session.authenticated = true;
							res.redirect("/");
						} else {
							res.render("login", {"errorMessage" : "Password is incorrect."});
						}
					});
				} else {
					res.render("login", {"errorMessage" : "Username is incorrect"});
				}
			}
		});
    });

    app.get("/logout", function (req, res, next) {
		if (req.session) {
			req.session.destroy(function(err) {
				if(err) {
					return next(err);
				} else {
					return res.redirect("/");
				}
			});
		}
    });

    app.get("/polls", checkAuth, function (req, res, next) { // My polls
    	var userId = req.session.user;
    	var polls = [];
    	dbClient.query("select * from polls where userid = " + userId + " order by status desc, id", (err, result) => {
			if (err){
				console.log("Error find polls for current user: " + err);
				// if no polls, you still can see empty list
                res.render("polls", {"message" : "Here are the polls you created:", "polls" : []});
			} else {
				polls = result.rows;
				res.render("polls", {"message" : "Here are the polls you created:", "polls" : result.rows});
			}
		});
    });

    app.get("/poll/:poll([0-9]+)", function (req, res, next) {
    	var id = req.params.poll;
    	dbClient.query("select * from polls left join options on polls.id = options.pollId where polls.id = " + id, (err, result) => {
			if (err){
				console.log("Error find poll: " + err);
			} else {
				var poll = {};
				poll.id = id;
				poll.question = result.rows[0].question;
				poll.user = result.rows[0].userid;
				poll.status = result.rows[0].status;
				poll.published = result.rows[0].published;
				poll.options = [];
				for(var i=0; i<result.rows.length; i++){
					var option = result.rows[i];
					poll.options.push({"id" : option.id, "text" : option.text, "vote" : option.vote});
				}
				//console.log(poll);
				res.render("poll", {"poll" : poll});
			}
		});
    });

    app.get("/poll/create", checkAuth, function (req, res, next) {
        res.render("edit", {"poll" : null});
    });

	app.get("/poll/edit/:poll([0-9])", checkAuth, function (req, res, next) {
		// TODO: checkAuth doesn't work
		var id = req.params.poll;
		dbClient.query("select * from polls left join options on polls.id = options.pollId where polls.id = " + id, (err, result) => {
			if (err){
				console.log("Error find poll to edit: " + err);
			} else {
				var poll = {};
				poll.id = id;
				poll.question = result.rows[0].question;
				poll.user = result.rows[0].userid;
				poll.status = result.rows[0].status;
				poll.published = result.rows[0].published;
				poll.options = [];
				for(var i=0; i<result.rows.length; i++){
					var option = result.rows[i];
					poll.options.push({"id" : option.id, "text" : option.text, "vote" : option.vote});
				}
				res.render("edit", {"poll" : poll});
			}
		});
    });

	app.post("/poll/edit", checkAuth, function (req, res, next) { // TODO: no sense to combine create and edit
		var pollId = req.body.pollId;
		var userId = req.session.user;
		var question = req.body.question;
		var options = [];
		for(field in req.body){
			if(field.match(/option-[0-9]+/)){
				if(req.body[field].trim() !=""){
					options.push(req.body[field]);
				}
			}
		}

		if(pollId == undefined){ // create
			// TODO: make transaction
			dbClient.query("create table if not exists polls(id serial primary key, userid int not null, question text not null, status boolean default false, published timestamp)", (errCrPolls, resultCrPolls) => {
				if (errCrPolls){
					console.log("Error create table polls: " + errCrPolls);
				} else {
					dbClient.query("create table if not exists options(id serial primary key, pollid int not null, text varchar(255), vote int default 0)", (errCrOptions, resultCrOptions) => {
						if (errCrOptions){
							console.log("Error create table options: " + errCrOptions);
						} else {
							// insert poll
							dbClient.query("insert into polls (\"userid\", \"question\") values ("+ userId +", '"+ question +"') returning id", (errInsertPoll, resultInsertPoll) => {
								if (errInsertPoll){
									console.log("Error insert poll: " + errInsertPoll);
								} else {
									var pollId = resultInsertPoll.rows[0].id;
									// insert options
									var counter = 0;
									for(var i=0; i<options.length; i++){
										dbClient.query("insert into options (\"pollid\", \"text\") values ("+ pollId +", '"+ options[i] +"') returning id", (errInsertOptions, resultInsertOption) => {
											if (errInsertOptions){
												console.log("Error insert option: " + errInsertOptions);
											} else {
												counter++;
												if(counter == options.length-1){
													res.redirect("/polls");
												}
											}
										});
									}
								}
							});
						}
					});
				}
			});
		} else { // update
			dbClient.query("update polls set question = '"+ question +"' where id = "+ pollId +" and userid = "+ userId +" and status = false", (errUpdatePoll, resultUpdatePoll) => {
				if (errUpdatePoll){
					console.log("Error update poll: " + errUpdatePoll);
				} else {
					// delete old options
					dbClient.query("delete from options where id = (select id from options where pollid = "+ pollId +")", (errDeleteOptions, resultDeleteOption) => {
						if (errDeleteOptions){
							console.log("Error delete options: " + errDeleteOptions);
						} else {
							// insert new options
							var counter = 0;
							for(var i=0; i<options.length; i++){
								dbClient.query("insert into options (\"pollid\", \"text\") values ("+ pollId +", '"+ options[i] +"')", (errInsertOptions, resultInsertOption) => {
									if (errInsertOptions){
										console.log("Error insert options: " + errInsertOptions);
									} else {
										counter++;
										if(counter == options.length-1){
											res.redirect("/polls");
										}
									}
								});
							}
						}
					});
				}
			});
		}
	});

	app.post("/poll/publish/:poll([0-9])", checkAuth, function (req, res, next) {
		var id = req.params.poll;
		var userId = req.session.user;
    	dbClient.query("update polls set status = true, published = now() where id = " + id + " and userid = " + userId, (err, result) => {
			if (err){
				console.log("Error publishing the poll: " + err);
			} else {
				res.redirect("/polls");
			}
		});
    });

    app.post("/poll/vote/:poll([0-9])", function (req, res, next) {
    	var pollId = req.params.poll;
		var option = req.body.option;
		var newOption = req.body.newOption;

		if(option != undefined){
			dbClient.query("update options set vote = vote+1 where id = " + option + " and pollid = " + pollId, (err, result) => {
				if (err){
					console.log("Error voting the poll: " + err);
				} else {
					res.redirect("/poll/"+pollId);
				}
			});
		} else if(newOption != undefined){
			dbClient.query("insert into options (\"pollid\", \"text\", \"vote\") values ("+ pollId +", '"+ newOption +"', 1)", (err, result) => {
				if (err){
					console.log("Error voting new option: " + err);
				} else {
					res.redirect("/poll/"+pollId);
				}
			});
		} else {
			res.redirect("/poll/"+pollId);
		}
    });

	app.post("/poll/delete/:poll([0-9])", checkAuth, function (req, res, next) {
		var pollId = req.params.poll;
		dbClient.query("delete from options where pollid = " + pollId, (errDeleteOptions, resultDeleteOptions) => {
			if (errDeleteOptions){
				console.log("Error delete options: " + errDeleteOptions);
			} else {
				dbClient.query("delete from polls where id = " + pollId, (errDeletePoll, resultDeletePoll) => {
					if (errDeletePoll){
						console.log("Error delete poll: " + errDeletePoll);
					} else {
						res.redirect("/polls");
					}
				});
			}
		});
	});

   	app.get("*", function(req, res){
   		res.status(404).send("Can not find the page");
    });
}

// TODO: static files -> styles and graphs