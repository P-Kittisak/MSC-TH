//reqiure express & path modules
const express= require('express');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const cors = require('cors');
//authentication modules
let cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
let csrf = require('csrf');
let session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const database = require('./config/Database');
//instance express to app and using constructor to called middleware routes and errors
class App{
    constructor() {
        this.app=express();
        this.middleware();
        this.routes();
        this.errors();
    }
    middleware(){
        //Set up Views and Engine
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.set('views',path.join(__dirname,'views'));
        this.app.set('view engine','pug');

        //Reformat HTML code after renders
        this.app.locals.pretty =true;

        // log every request to the console
        this.app.use(morgan('dev'));
        // csrf token init
        const csrfProtection = csrf({ cookie: true});
        // get info from html forms
        this.app.use(cors());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({extended: false}));
        //read cookie
        this.app.use(cookieParser());
        //setup session secret
        this.app.use(session({ secret: 'Kittisak422543', saveUninitialized: true, resave: true}));
        // pass passport for configuration
        require('./config/passport')(passport);
        // init passport
        this.app.use(passport.initialize());
        // persistent login sessions
        this.app.use(passport.session());
        // use connect-flash for flash messages stored in session
        this.app.use(flash());
        // Session-persisted message middleware
        this.app.use(function(req, res, next){
            const err = req.session.error,
                msg = req.session.notice,
                success = req.session.success;

            delete req.session.error;
            delete req.session.success;
            delete req.session.notice;

            if(err) res.locals.error = err;
            if(msg) res.locals.notice = msg;
            if(success) res.locals.success = success;

            next();
        });
    }
    routes(){
        // routes
        const routes = require('./routes/routes');
        const users = require('./routes/users')(this.app, passport);
        const admin = require('./routes/admin');
        const profile = require('./routes/profile');
        const shop = require('./routes/shop');
        const community = require('./routes/community');
        const cart = require('./routes/cart');
        const checkout = require('./routes/checkout');
        this.app.use('/', routes);
        this.app.use('/Account', profile);
        this.app.use('/admin', admin);
        this.app.use('/shop', shop);
        this.app.use('/community', community);
        this.app.use('/cart', cart);
        this.app.use('/checkout', checkout);
    }
    errors(){
        // catch 404 and forward to error handler
        this.app.use(function (req,res,next){
            const err = new Error('Not Found');
            err.status = 404;
            next(err);
        });

        // error handlers

        if (this.app.get('env') === 'development') {
            this.app.use(function (err, req, res, next) {
                res.status(err.status || 500);
                res.render('error', {
                    message: err.message,
                    error: err
                });
            });
        }

        // production error handler
        // no stacktraces leaked to user
        this.app.use(function (err, req, res, next) {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err
            });
        });
        // Create an HTTP service.
        http.createServer(this.app).listen(80, '127.0.0.1');
        // this.app.listen(80, '127.0.0.1');
    }
}
module.exports = new App().app;
