/* understand "express + passport" */

var node_version = process.version;
if(node_version.indexOf('v6') == -1) {
	return console.log('\x1b[31m[error]\x1b[0m require node v6');
}

/* dependencies */
var app = require('express')();
var session = require('express-session');
var body_parser = require('body-parser');
var cookie_parser = require('cookie-parser');
var flash = require('connect-flash');
var verify_session = require('connect-ensure-login').ensureLoggedIn;
var passport = require('passport');
var passport_local = require('passport-local').Strategy;
/* ^dependecies */

/* custom database */
var background_process = process.nextTick;
var user = {
	list: [
		{ "username": "joe", "password": "111" },
		{ "username": "jane", "password": "222" },
		{ "username": "jib", "password": "333" }
	],
	findByUsername(username, callback) {
		background_process(() => {
			for(i of this.list) {
				if (i.username === username) {
					return callback(i);
				}
			}
			return callback(null);
		});
	}
};
/* ^custom database */

/* passport */
passport.use(new passport_local(
(username, password, done) => {
	user.findByUsername(username, (result) => {
		var message = 'Invalid Username or Password';
		if(result == null) {
			return done(null, false, { message: message });
		}
		if(result.password != password) {
			return done(null, false, { message: message });
		}
		return done(null, result);
	});
}));
passport.serializeUser((user, callback) => {
	callback(null, user.username);
});
passport.deserializeUser((username, callback) => {
	user.findByUsername(username, (result) => {
		if (result == null) {
			return callback(result);
		}
		callback(null, result.username);
	});
});
/* ^passport */

/* middlewares */
app.use(flash());
app.use(cookie_parser());
app.use(body_parser.urlencoded({ extended: false }));
app.use(session({ secret: '...', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
/* ^middlewares */

/* routes */
app.post('/login', passport.authenticate('local', {
	successRedirect: '/',
	failureRedirect: '/login',
	badRequestMessage : 'Missing Username or Password',
	failureFlash: true
}));
app.get('/login', (req, res) => {
	var errors = req.flash('error');
	var html = '<html><head><title>Login</title><style>*{ margin-bottom:5px; }</style></head><body>';
		html += '<form method="post" action="/login"><p><b>Login</b></p><input type="text" name="username" placeholder="Username"><br><input type="password" name="password" placeholder="Password"><br><button type="submit">Log in</button></form>';
	if(errors.length > 0) {
		html += `<div style="color:red"><i>${errors[0]}</i></div>`;
	}
	else if(req.originalUrl == '/login?') {
		html += `<div style="color:green"><i>Logged out</i></div>`;
	}
		html += "</body></html>";
	res.send(html);
});
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/login?');
});
app.get('/', verify_session(), (req, res) => {
	var user = req.session.passport.user
	var html = '<html><head><title>Logged in</title><style>*{ margin-bottom:5px; }</style></head><body>';
		html += `<p>Logged in as <b>${user}</b></p><a href="/logout"><button>Log out</button></a>`;
		html += '</body></html>';
	res.send(html);
});
/* ^routes */

app.listen(3000,() => { console.log("listening on port 3000"); });
