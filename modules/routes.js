module.exports = function (express, app, path, bcrypt) {

	app.use(express.static(path.join(__dirname, "public")));

	function checkAuth(req, res, next){
		console.log(req.url);
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
        res.render("registration", {});
    });

    app.post("/registration", function (req, res, next) {
    	// process registration process
    });

	app.get("/login", function (req, res, next) {
    	res.render("login", {"errorMessage" : ""});
   	});

   	app.post("/login", function (req, res, next) {

   		var userName = "User";
   		var hash = "passwordHashByBcrypr";

   		console.log(req.body);

   		var login = req.body.login ? req.body.login : "";
   		var password = req.body.password ? req.body.password : "";

		if(login === userName){
			bcrypt.compare(password, hash, function(err, result) {
				if(result) {
					req.session.authenticated = true;
					res.redirect("/");
				} else {
					res.render("login", {"errorMessage" : "Password is incorrect."});
				}
			});
		} else {
			res.render("login", {"errorMessage" : "Login is incorrect."});
		}
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
    		// process create poll
    		// can create list of options
        res.render("edit", {"pollId" : null});
    });

	app.get("/poll/edit/:poll([0-9])", checkAuth, function (req, res, next) {
	console.log(111);
		var id = req.params.poll;
        res.render("edit", {"pollId" : id});
    });

	app.post("/poll/edit/:poll([0-9])", checkAuth, function (req, res, next) {
		var id = req.params.poll;
		// process edit poll
		// can edit list of options
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