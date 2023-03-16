// config/passport.js

// load all the things we need
var LocalStrategy = require('passport-local').Strategy;

// Generate Hash
var bcrypt = require('bcrypt-nodejs');
const { Sequelize } = require('sequelize');

// database module
var database = require('../config/database');

// expose this function to our app using module.exports
module.exports = function (passport) {
    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        done(null, user.user_Id);
    });

    // used to deserialize the user
    passport.deserializeUser(function (user_Id, done) {
        let sqlStr = '\
            SELECT *\
            FROM users\
            where user_Id = \'' + user_Id + '\'';
        database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT,(rows)=>{
            done(null, rows[0]);
        });
    });

    passport.use('login', new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows to pass back the entire request to the callback
        },
        function (req, username, password, done) { // callback with username and password from form
            // check to see if the user exists or not
            let sqlStr = 'SELECT * FROM users WHERE username = \'' + username + '\'';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (rows) {
                // if no user is found, return the message
                if (rows.length < 1)
                    return done(null, false, req.flash('logInError', 'ไม่พบบัญชีผู้ใช้นี้อยู่ในระบบ')); // req.flash is the way to set flashdata using connect-flash
                // if the user is found but the password is wrong
                if (!bcrypt.compareSync(password, rows[0].password))
                    return done(null, false, req.flash('logInError', 'ชื่อบัญชีหรือรหัสผ่านผิด กรุณากรอกใหม่อีกครั้ง')); // create the loginMessage and save it to session as flashdata
                // all is well, return successful user
                return done(null, rows[0]);
            });

        })
    );


    passport.use('sign-up', new LocalStrategy({
            // by default, local strategy uses username and password
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, username, password, done) {
            if (password != req.body.rePassword) {
                return done(null, false, req.flash('signUpError', 'รหัสผ่านของท่านไม่ตรงกันกรุณากรอกใหม่อีกครั้ง'));
            }else{
                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                let email = req.body.email;
                let selectQuery = 'SELECT email\
                    FROM users\
                    WHERE email = \'' + email + '\'';
                    database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (emailRows) {
                    if (emailRows.length > 0) {
                        return done(null, false, req.flash('signUpError', 'อีเมลนี้ถูกใช้ไปแล้ว กรุณากรอกอีเมลใหม่อีกครั้ง'));
                    }
                    else {
                        let selectQuery = '\
                        SELECT username\
                        FROM users\
                        WHERE username = \'' + username + '\'';
                        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (usernameRows) {
                            if (usernameRows.length > 0) {
                                return done(null, false, req.flash('signUpError', 'บัญชีผู้ใช้ถูกใช้งานแล้ว กรุณากรอกบัญชีผู้ใช้งานใหม่'));
                            }
                            else {
                                // if there is no user with that user and email
                                let fullname = req.body.fullname;
                                // var cid = req.body.cid.replace(/-/g, '');
                                let email = req.body.email;
                                let passwordHash = bcrypt.hashSync(password, null, null);
                                let insertQuery = 'INSERT INTO users\
                                    VALUES(null,\
                                    \'' + username + '\', \
                                    \'' + passwordHash + '\', \
                                    \'' + fullname + '\', \
                                    \'' + email + '\', 0)';
                                    database.RunQuery(insertQuery,Sequelize.QueryTypes.INSERT, function(insertResult){
                                        let user = {
                                        user_Id: insertResult[0].insertId};
                                return done(null, user);
                                });
                            }
                        });
                    }
                });
            }
        })
    );
    passport.use('sign-up-community', new LocalStrategy({
            // by default, local strategy uses username and password
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, username, password, done) {
            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
                let email = req.body.email;
                let Community = req.body.Community;
                let selectQuery = 'SELECT email\
                    FROM users\
                    WHERE email = \'' + email + '\'';
                    database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (emailRows) {
                    if (emailRows.length > 0) {
                        // console.log("อีเมลนี้ถูกใช้ไปแล้ว");
                        return done(null, false, req.flash('signUpCommunityError', 'อีเมลนี้ถูกใช้ไปแล้ว กรุณากรอกอีเมลใหม่อีกครั้ง'));
                    }
                    else {
                        selectQuery = '\
                        SELECT username\
                        FROM users\
                        WHERE username = \'' + username + '\'';
                        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (usernameRows) {
                            if (usernameRows.length > 0) {
                                // console.log("บัญชีผู้ใช้ถูกใช้งานแล้ว กรุณากรอกบัญชีผู้ใช้งานใหม่");
                                return done(null, false, req.flash('signUpCommunityError', 'บัญชีผู้ใช้ถูกใช้งานแล้ว กรุณากรอกบัญชีผู้ใช้งานใหม่'));
                            }
                            else{
                                selectQuery = '\
                                SELECT *\
                                FROM communities natural join community\
                                WHERE community_id = \'' + Community + '\'';
                                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (CommunityRows) {
                                    if (CommunityRows.length > 0) {
                                        // console.log("มีชุมชนนี้อยู่ในระบบอยู่ กรุณาสมัครร้านค้าที่ชุมชนนั้นได้เลยครับ");
                                        return done(null, false, req.flash('signUpCommunityError', 'มีชุมชนนี้อยู่ในระบบอยู่ กรุณาสมัครร้านค้าที่ชุมชนนั้นได้เลยครับ'));
                                    }
                                    else {
                                        let fullname = req.body.fullname;
                                        let email = req.body.email;
                                        let phone = req.body.phone;
                                        let address = req.body.address;
                                        let province = req.body.Province;
                                        let amphure = req.body.Amphure;
                                        let tambon = req.body.Tambon;
                                        let community = req.body.Community;
                                        // var zipcode = req.body.zip_code;
                                        let passwordHash = bcrypt.hashSync(password, null, null);
                                        let insertQuery = 'INSERT INTO users\
                                            VALUES(null,\
                                            \'' + username + '\', \
                                            \'' + passwordHash + '\', \
                                            \'' + fullname + '\', \
                                            \'' + email + '\', 2)';
                                            database.RunQuery(insertQuery,Sequelize.QueryTypes.INSERT, function(insertResult) {
                                            var user = {
                                                user_Id: insertResult[0].insertId
                                            };
                                            var user_Id = insertResult[0].insertId;
                                            let insertQuery = 'INSERT INTO address\
                                            VALUES(null, ' +
                                                insertResult[0].insertId + ', \'' +
                                                fullname + '\', \'' +
                                                phone + '\', \'' +
                                                address + '\', \'' +
                                                province + '\', \'' +
                                                amphure + '\', \'' +
                                                tambon + '\')';
                                                database.RunQuery(insertQuery,Sequelize.QueryTypes.INSERT, function(insertCommunity) {
                                                    let insertCommunity1 = 'INSERT INTO communities\
                                                    VALUES(' +
                                                        user_Id + ', \'' +
                                                        community + '\')';
                                                        database.RunQuery(insertCommunity1,Sequelize.QueryTypes.INSERT, function (addRow){
                                                        return done(null, user);
                                                });
                                            });                                       
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            })
    );
    passport.use('sign-up-shop', new LocalStrategy({
            // by default, local strategy uses username and password
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, username, password, done) {
            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
                let email = req.body.email;
                let selectEmail = 'SELECT email\
                    FROM users\
                    WHERE email = \'' + email + '\'';
                database.RunQuery(selectEmail,Sequelize.QueryTypes.SELECT, function (emailRows) {
                    if (emailRows.length > 0) {
                        // console.log("อีเมลนี้ถูกใช้ไปแล้ว");
                        return done(null, false, req.flash('signUpShopError', 'อีเมลนี้ถูกใช้ไปแล้ว กรุณากรอกอีเมลใหม่อีกครั้ง'));
                    }
                    else {
                        selectQuery = '\
                        SELECT username\
                        FROM users\
                        WHERE username = \'' + username + '\'';
                        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (usernameRows) {
                            if (usernameRows.length > 0) {
                                // console.log("บัญชีผู้ใช้ถูกใช้งานแล้ว กรุณากรอกบัญชีผู้ใช้งานใหม่");
                                return done(null, false, req.flash('signUpShopError', 'บัญชีผู้ใช้ถูกใช้งานแล้ว กรุณากรอกบัญชีผู้ใช้งานใหม่'));
                            }
                            else {
                                let fullname = req.body.fullname;
                                let email = req.body.email;
                                let phone = req.body.peopleCommunityPhone;
                                let communityShopName = req.body.communityShopName;
                                let bankNumber = req.body.bankNumber;
                                let bankName = req.body.bankName;
                                let community = req.body.Community;
                                let passwordHash = bcrypt.hashSync(password, null, null);
                                let insertQuery = 'INSERT INTO users\
                                    VALUES(null,\
                                    \'' + username + '\', \
                                    \'' + passwordHash + '\', \
                                    \'' + fullname + '\', \
                                    \'' + email + '\', 3)';
                                database.RunQuery(insertQuery,Sequelize.QueryTypes.INSERT, function(insertResult) {
                                    let user = {
                                        user_Id: insertResult[0].insertId
                                    };
                                    let user_Id = insertResult[0].insertId;
                                    let insertBank = 'INSERT INTO bank\
                                    VALUES(null, "' +
                                        bankNumber + '", \'' +
                                        bankName + '\', \'' +
                                        null + '\')';
                                        database.RunQuery(insertBank,Sequelize.QueryTypes.INSERT, function(insertBank) {
                                            let insertCommunity1 = 'INSERT INTO people_community\
                                            VALUES(null, ' +
                                                community + ', \'' + 
                                                insertBank[0].insertId + '\', \'' +
                                                user_Id + '\', \'' +
                                                communityShopName + '\', \'' +
                                                fullname + '\', \'' +
                                                phone + '\')';
                                            database.RunQuery(insertCommunity1,Sequelize.QueryTypes.INSERT, function (addRow){
                                                return done(null, user);
                                        });
                                    });                                       
                                });
                            }
                        });
                    }
                });
        })
    );
};