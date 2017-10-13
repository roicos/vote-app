module.exports = function (express, app, path, bcrypt, dbClient) {

	app.use(express.static(path.join(__dirname, "public")));

	function checkAuth(req, res, next){
		var privatePages = ["/", "/polls/", "/poll/create/", "/poll/edit/", "/poll/delete/", "/option/create/"];
		if ((privatePages.indexOf(req.url) > -1 || privatePages.indexOf(req.url+"/") > -1 )&& (!req.session || !req.session.authenticated)) {
			res.redirect("/login");
		} else {
			next();
		}
	}

	app.get("/", checkAuth, function (req, res, next) {
    		res.render("index");
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

// Petya: password
// Vasya: secret

// Mumu
// pass

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
							req.session.userId = result.rows[0]["id"];
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
		res.render("polls", {});
    });

    app.get("/poll/:id([0-9])", function (req, res, next) {
    	var id = req.params.id;
    	res.render("poll", {"id" : id});
    });

    app.get("/poll/create", checkAuth, function (req, res, next) {
        res.render("edit", {"pollId" : null});
    });

	app.get("/poll/edit/:poll([0-9])", checkAuth, function (req, res, next) {
		console.log(111);
		var id = req.params.poll;
        res.render("edit", {"pollId" : id});
    });

	app.post("/poll/edit/:poll([0-9])", checkAuth, function (req, res, next) {

		var id = req.params.poll;
		console.log(id);
		var user = req.session.userId;
		console.log(user);
		var question = req.body.question;
		// process create poll with list of options in id == null
		// or process edit poll with list of options
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