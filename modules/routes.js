// TODO: make all the data safe before insert or update

module.exports = function (express, app, path, bcrypt, dbClient) {

	app.use(express.static(path.join(__dirname, "public")));

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
		dbClient.query("select * from polls limit 20", (err, result) => { // TODO: published only
			if (err){
				console.log("Error find polls: " + err);
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
				var userName = req.body.username;
				// TODO: check if user exists

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
    	dbClient.query("select * from polls where userid = " + userId, (err, result) => {
			if (err){
				console.log("Error find polls for current user: " + err);
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
        res.render("edit", {"pollId" : null});
    });

	app.get("/poll/edit/:poll([0-9])", checkAuth, function (req, res, next) {
		// TODO: checkAuth doesn't work
		var id = req.params.poll;
        res.render("edit", {"pollId" : id});
    });

	app.post("/poll/edit", checkAuth, function (req, res, next) {
		var poll = req.body.poll;
		var userId = req.session.user;
		var question = req.body.question;
		var options = [];
		if(poll == undefined){ // create
			for(field in req.body){
				if(field.match(/option-new-[0-9]+/)){
					options.push(req.body[field]);
				}
			}
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
			// res.redirect("/polls");
		}


		// id, user, question, status (published are not for editing), date_created
		// id, poll, text, vote

	});

	app.post("/poll/delete/:poll([0-9])", checkAuth, function (req, res, next) {
		// process delete poll: delete options, delete poll
	});

	app.post("/option/create/:poll([0-9])", checkAuth, function (req, res, next) {
    	// add option to existing poll
    });

   	app.get("*", function(req, res){
   		res.status(404).send("Can not find the page");
    });
}