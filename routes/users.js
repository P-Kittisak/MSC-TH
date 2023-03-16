const { Sequelize } = require('sequelize');
//import database module
var database = require('../config/database');
const CartData = require('../routes/modules');
// Route User Page
function getNestedChildren(arr, ref_Category_Id) {
    var out = []
    for (var i in arr) {
    if (arr[i].ref_Category_Id == ref_Category_Id) {
        var children = getNestedChildren(arr, arr[i].category_Id)

        if (children.length) {
        arr[i].subCate = children
        }
        out.push(arr[i])
    }
    }
    return out
}
module.exports = function (app, passport) {

    app.get('/login', async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        contextDict.title= 'เข้าสู่ระบบ/สมัครสมาชิก',
        contextDict.logInError= req.flash('logInError'),
        res.render('login', contextDict);
    });

    app.post('/login', passport.authenticate('login', {
        successRedirect: '/Account/', // redirect to the secure profile section
        failureRedirect: '/login', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    app.get('/sign-up', async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        // render the page and pass in any flash data if it exists
        contextDict.title= 'สมัครสมาชิก',
        contextDict.signUpError= req.flash('signUpError'),
        res.render('sign-up', contextDict);
    });

    // process the signup form
    app.post('/sign-up', passport.authenticate('sign-up', {
        successRedirect: '/Account', // redirect to the secure profile section
        failureRedirect: '/sign-up', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // process the signup form
    app.post('/sign-up-shop', passport.authenticate('sign-up-shop', {
        successRedirect: '/shop', // redirect to the secure profile section
        failureRedirect: '/sign-up-shop', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    app.get('/sign-up-shop', async function (req, res) {
        // render the page and pass in any flash data if it exists
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlStr = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
            let selectQuery = '\
                SELECT *\
                FROM communities natural join community';
            var cate=JSON.stringify(getNestedChildren(category,0));
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (communities) {
                contextDict.title= 'สมัครเป็นร้านค้ากับ',
                contextDict.signUpShopError= req.flash('signUpShopError'),
                contextDict.categories=cate,
                contextDict.communities= communities
                res.render('sign-up-shop', contextDict);
            });
        });
    });

    app.get('/sign-up-community', async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        // render the page and pass in any flash data if it exists
        let sqlStr = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
            selectQuery = '\
                SELECT *\
                FROM provinces';
            var cate=JSON.stringify(getNestedChildren(category,0));
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (provinces) {
                contextDict.title= 'สมัครเป็นชุมชนกับ',
                contextDict.signUpCommunityError= req.flash('signUpCommunityError'),
                contextDict.categories=cate,
                contextDict.provinces= provinces
                res.render('sign-up-community', contextDict);
            });
        });
    });

    // process the signup form
    app.post('/sign-up-community', passport.authenticate('sign-up-community', {
        successRedirect: '/community', // redirect to the secure profile section
        failureRedirect: '/sign-up-community', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    app.get('/sign-up-community/:provinces_id', function (req, res){
        let selectQuery = '\
            SELECT *\
            FROM amphures where province_id='+req.params.provinces_id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (amphures) {
            res.send(amphures);
        });
    });
    
    app.get('/sign-up-community/:provinces_id/:amphure_id', function (req, res){
        let selectQuery = '\
            SELECT *\
            FROM  tambons Where amphure_id='+req.params.amphure_id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (tambons) {
            res.send(tambons);
        });
    });

    app.get('/sign-up-community/:provinces_id/:amphures_id/:tambons_id', function (req, res){
        let selectQuery = '\
            SELECT *\
            FROM  community Where tambons_id='+req.params.tambons_id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
            res.send(community);
        });
    });

    // log out
    app.get('/sign-out', (req, res,next) => {
            req.logout(next);
            res.redirect('/');
        });
};