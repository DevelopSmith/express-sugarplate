require('dotenv').load();

import express from 'express';
import http from 'http';
import path from 'path';
import favicon from 'serve-favicon';
import cookieParser from 'cookie-parser';
import multiparty from 'connect-multiparty';
import bodyParser from 'body-parser';
import passport from 'passport';
import session from 'express-session';
const morgan = require('morgan');
const debug = require('debug')('express-sugarplate:server');
const MongoStore = require('connect-mongo')(session);

require('./app_api/models/db');
require('./app_api/config/passport')(passport);

const routes = require('./app_server/routes/index');
const routesApi = require('./app_api/routes/index');

// Normalize a port into a number, string, or false.
const normalizePort = val => {
	const port = parseInt(val, 10);

	if(isNaN(port)){
		return val; // named pipe
	}

	if(port >= 0){
		return port;// port number
	}

	return false;
}

const app = express();
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const server = http.createServer(app);

// Listen on provided port, on all network interfaces.
server.listen(port);

// Event listener for HTTP server "error" event.
server.on('error', error => {
	if(error.syscall !== 'listen'){
		throw error;
	}

	const bind = (typeof port === 'string' ? 'Pipe ' : 'Port ') + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error(`${bind} requires elevated privileges`);
			process.exit(1);
			break;
		case 'EADDRINUSE':
			console.error(`${bind} is already in use`);
			process.exit(1);
			break;
		default:
			throw error;
	}
});

// Event listener for HTTP server "listening" event.
server.on('listening', () => {
	const addr = server.address();
	const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
	debug('Listening on ' + bind);
});

// view engine setup
app.set('views', path.join(__dirname, 'app_server/views'));
app.set('view engine', 'pug');

app.use((req, res, next) => {
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', '*');

	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');

	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);

	// Pass to next layer of middleware
	next();
});

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(multiparty());

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
	secret: process.env.SESSION_SECRET,
	store: new MongoStore({
		url: process.env.DATABASE_URI,
	}),
	cookie: {
		maxAge: 604800000 // one week
	},
	saveUninitialized: false,
	resave: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);
app.use('/api', routesApi);

// catch 404 and forward to error handler
app.use((req, res, next)=> {
	const err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if(app.get('env') === 'development') {
	app.use((err, req, res, next) => {
		res.status(err.status || 500);

		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});

//> Mohamed, READ THIS: https://stackoverflow.com/questions/5999373/how-do-i-prevent-node-js-from-crashing-try-catch-doesnt-work
process.on('uncaughtException', error => console.log(error.stack));

module.exports = app;