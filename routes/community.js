var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt-nodejs');
const { Sequelize } = require('sequelize');
//import database module
var database = require('../config/database');
//UploadImage use of Multer
const multer = require('multer');

// Community Page
const storage=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'public/images/product')
    },
    filename:(req,file,cb)=>{
        const mimeExtendsion={
            'image/jpeg':'.jpeg',
            'image/jpg':'.jpg',
            'image/png':'.png'
        }
        cb(null,file.fieldname+'_'+Date.now()+mimeExtendsion[file.mimetype]);
    }
})
const upload_Image_Product = multer({
    storage:storage,
    fileFilter:(req,file,cb)=>{
        if(file.mimetype==='image/jpeg' ||
        file.mimetype==='image/jpg'||
        file.mimetype==='image/png'){
            cb(null,true);
        }else{
            cb(null,false);
        }
    }

});

function isCommunity(req, res, next) {
    if (req.isAuthenticated()) {
        
        if (req.user.user_status == 2) {
            return next();
        }
        else if (req.user.user_status == 0){
            res.redirect('/Account/');
        }
        else if (req.user.user_status == 3 || req.user.user_status == 4 || req.user.user_status == 5) {
            res.redirect('/shop');
        }
        else if (req.user.user_status == 1) {
            res.redirect('/admin');
        }
    }
    res.redirect('/');
}

router.route('/')
    .get(isCommunity, function (req, res, next) {
        res.redirect('community/home');
    });

router.route('/home')
    // const community=req.user.password.substring(4,7)
    .get(isCommunity, function (req, res, next) {
        let selectQueryUsers = '\
            SELECT *\
                FROM users natural join communities natural join community\
                WHERE user_Id = ' + req.user.user_Id;
            database.RunQuery(selectQueryUsers,Sequelize.QueryTypes.SELECT, function (community) {
                let selectQuery = "\
                select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
                    FROM orders natural join order_lists natural join product\
                    natural join people_community natural join community where\
                    community_id = " + community[0].community_id + "\
                    and orders.order_Status='3' group by order_lists.product_Id order by product.product_Id ASC"
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (orderSummary) {
                    res.render('community/community',{
                    title: 'ร้านค้า',
                    Community: req.user,
                    orderSummary:orderSummary,
                    community: community[0]
            })
        });
    });
})

router.route('/product')
    .get(isCommunity, async function (req, res) {
        let SelectCommunity= "\
            SELECT * FROM users natural join communities natural join community\
            WHERE user_Id = " + req.user.user_Id;
            database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
                let Selectimg= "\
                SELECT *\
                ,JSON_EXTRACT(main_Product_Img,'$.filename0') As productImage FROM people_community natural join product natural join product_img natural join category\
                WHERE community_id = " + community[0].community_id;
                database.RunQuery(Selectimg,Sequelize.QueryTypes.SELECT, function (Product) {
                res.render('community/product',{
                    title: 'สินค้าชุมชน',
                    Community: req.user,
                    product: Product,
                    community: community[0]
                });
            });
        });
    })


router.route('/communityProfile')
    .get(isCommunity, async function (req, res) {
        let selectQuery = '\
            SELECT *\
            FROM users natural join communities natural join community natural join address\
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
            res.render('community/communityProfile', {
                title: 'โปรไฟล์',
                Community: req.user,
                community: community[0],
                communityProfile:community
            });
        });
    })

    .post(isCommunity, function (req,res){
        let form = req.body;
        let updateQuery = '\
        UPDATE users natural join communities natural join address\
        SET fullname_user = \'' + form.fullname + '\', \
            phone = \'' + form.communityPhone + '\' \
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result){
            res.redirect('/community/communityProfile');
            });
        });

router.route('/communityProfile/:username/:str/editEmail')
    .post(isCommunity, function (req,res){
        let form = req.body;
        let selectQuery = '\
            SELECT *\
            FROM users natural join communities natural join community\
            WHERE user_Id = ' + req.user.user_Id;
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
                if (bcrypt.compareSync(form.password, req.user.password)){
                    let selectQueryEmail = 'SELECT *\
                        FROM users\
                        WHERE email = \'' + form.email + '\'';
                    database.RunQuery(selectQueryEmail,Sequelize.QueryTypes.SELECT, function (emailRows) {
                        if(emailRows.length > 0) {
                            req.flash('Email', 'อีเมลถูกใช้ไปแล้ว กรุณากรอกอีเมลใหม่อีกครั้ง');
                            res.render('community/communityProfile', {
                                title: 'โปรไฟล์',
                                Community: req.user,
                                CheckedEmail: req.flash('Email'),
                                community: community[0],
                                communityProfile:community
                            })
                        }else{
                            let updateQuery = '\
                            UPDATE users\
                            SET email = \'' + form.email + '\' \
                            WHERE user_Id = ' + req.user.user_Id;
                            database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result){
                                res.redirect('/community/communityProfile');
                            });
                        }
                    });
                    }else{
                        req.flash('Password', 'เปลี่ยนอีเมลไม่สำเร็จ พาสเวิร์ดไม่ถูกต้อง กรุณากรอกพาสเวิร์ดใหม่อีกครั้ง');
                        res.render('community/communityProfile',{
                            title: 'โปรไฟล์',
                            Community: req.user,
                            CheckPassword: req.flash('Password'),
                            community: community[0],
                            communityProfile:community
                    });
                }
            });
        });


router.route('/communityProfile/changePassword')
    .get(isCommunity, async function (req, res) {
        let selectQuery = '\
            SELECT *\
            FROM users natural join communities natural join community\
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
            res.render('community/changePassword', {
                title: 'โปรไฟล์-เปลี่ยนรหัสผ่าน',
                Community: req.user,
                community: community[0],
                communityProfile:community
            });
        });
    })

    .post(isCommunity, function (req,res){
        var form = req.body;
        let selectQuery = '\
            SELECT *\
            FROM users natural join communities natural join community\
            WHERE user_Id = ' + req.user.user_Id;
        if (form.newPassword == form.repeatPassword) {
            if (bcrypt.compareSync(form.currentPassword, req.user.password)) {
                let passwordHash = bcrypt.hashSync(form.newPassword, null, null);
                let updateQuery = '\
                UPDATE users\
                SET password = \'' + passwordHash + '\' \
                WHERE user_Id = ' + req.user.user_Id;
                database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result) {
                    res.redirect('/community/communityProfile');
                }
                );
            }
            else {
                //-  password wrong
                req.flash('password','รหัสผ่านเดิมไม่ถูกต้อง  กรุณากรอกรหัสผ่านใหม่อีกครั้ง');
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
                    res.render('community/changePassword', {
                        title: 'โปรไฟล์-เปลี่ยนรหัสผ่าน',
                        Community: req.user,
                        community: community[0],
                        Checkedpass: req.flash('password'),
                    });
                });
            }
        }
        else {
            //- passwords are not matched
            req.flash('password','รหัสผ่านใหม่ไม่ตรงกัน กรุณากรอกรหัสผ่านใหม่อีกครั้ง');
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
                res.render('community/changePassword', {
                    title: 'โปรไฟล์-เปลี่ยนรหัสผ่าน',
                    Community: req.user,
                    community: community[0],
                    Checkedpass: req.flash('password'),
                });
            });
        }
    });


router.route('/people')
    .get(isCommunity, async function (req, res) {
        let selectCommunity = '\
            SELECT *\
            FROM users natural join communities natural join community\
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(selectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            let selectQuery = '\
                SELECT user_Id,people_Community_Fullname,community_Shop_Name,user_status,people_Community_Phone\
                FROM people_community natural join community natural join users\
                WHERE user_status  = 3 AND community_id = ' + community[0].community_id;
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (peopleCommunity) {
                res.render('community/checkPeopleCommunity', {
                    title: 'ชุมชน',
                    Community: req.user,
                    community: community[0],
                    peopleCommunity: peopleCommunity
                });
            });
        });
    })

router.route('/people/:userStatus/:userId')
    .post(isCommunity, function (req,res){
        let selectCommunity = '\
            SELECT *\
            FROM users natural join communities natural join community\
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(selectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            let updateQuery = '\
            UPDATE people_community natural join community natural join users\
            SET user_status = \'' + req.params.userStatus + '\' \
                WHERE user_Id = ' + req.params.userId + " and community_id = " + community[0].community_id;
            database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result){
                res.redirect('/community/people');
                });
            });
        });

router.route('/peopleCommunity')
    .get(isCommunity, async function (req, res) {
        let selectCommunity = '\
            SELECT *\
            FROM users natural join communities natural join community\
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(selectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            let selectQuery = '\
                SELECT community_Shop_Name,people_Community_Phone,people_Community_Fullname\
                FROM people_community natural join community natural join users\
                WHERE user_status  = 4 AND community_id = ' + community[0].community_id;
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (peopleCommunity) {
                res.render('community/peopleCommunity', {
                    title: 'ชุมชน',
                    Community: req.user,
                    community: community[0],
                    peopleCommunity: peopleCommunity,
                });
            });
        });
    })

router.route('/address')
    .get(isCommunity, async function (req, res) {
        let selectCommunity = '\
            SELECT *\
            FROM users natural join communities natural join community\
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(selectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            let selectQuery = '\
                SELECT fullname,address,provinces_name,amphures_name,tambons_name,zip_code,community_name,phone\
                FROM address natural join provinces natural join amphures natural join tambons natural join communities natural join community\
                WHERE user_Id = ' + req.user.user_Id;
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (addressCommunity) {
                res.render('community/addressCommunity', {
                    title: 'ที่อยู่ชุมชน',
                    Community: req.user,
                    community: community[0],
                    addressCommunity: addressCommunity
                });
            });
        });
    })

    .post(isCommunity, function (req,res){
        let form = req.body;
        let updateQuery = '\
        UPDATE users natural join address\
        SET address = \'' + form.addressCommunity + '\', \
            phone = \'' + form.communityPhone + '\' \
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result){
            res.redirect('/community/address');
        });
    });

router.route('/orderSummary')
    .get(isCommunity, async function (req, res) {
        let selectQuery = '\
            SELECT *\
                FROM users natural join communities natural join community\
                WHERE user_Id = ' + req.user.user_Id;
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
                let selectQuery = "\
                select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
                    FROM orders natural join order_lists natural join product\
                    natural join people_community natural join community where\
                    community_id = " + community[0].community_id + "\
                    and orders.order_Status='3' group by order_lists.product_Id order by product.product_Id ASC"
                    database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (orderSummary) {
                    res.render('community/orderSummary', {
                        title: 'สรุปยอดรวมคำสั่งซื้อ',
                        Community: req.user,
                        community: community[0],
                        orderSummary: orderSummary
                    });
                });
            });
        })

router.route('/orderSummary/searchOrder')
    .post(isCommunity, async function (req, res) {
        let form = req.body;
        let SelectCommunity = '\
            SELECT *\
            FROM users natural join communities natural join community\
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            if (form.communityShopName == "" && form.productName == ""){
                let selectQuery = "\
                select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
                FROM orders natural join order_lists natural join product\
                natural join people_community natural join community where \
                community_id = " + community[0].community_id + "\
                and orders.order_Status='3' and DATE_FORMAT(orders.update_At,'%Y-%m') between '" + form.timeStart + "' and '" + form.timeEnd + "' group by order_lists.product_Id order by product.product_Id ASC";
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (searchOrder) {
                    res.render('community/searchOrderSummary', {
                        title: 'ค้นหายอดรวมคำสั่งซื้อ',
                        Community: req.user,
                        community: community[0],
                        searchOrder: searchOrder,
                        timeStart: form.timeStart,
                        timeEnd: form.timeEnd
                    });
                });
            }else if (form.communityShopName != "" && form.productName == ""){
                let selectQuery = "\
                select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
                FROM orders natural join order_lists natural join product\
                natural join people_community natural join community where \
                community_id = " + community[0].community_id + "\
                and orders.order_Status='3' and community_Shop_Name like '%" + form.communityShopName + "%' and DATE_FORMAT(orders.update_At,'%Y-%m') between '" + form.timeStart + "' and '" + form.timeEnd + "' group by order_lists.product_Id order by product.product_Id ASC";
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (searchOrder) {
                    res.render('community/searchOrderSummary', {
                        title: 'ค้นหายอดรวมคำสั่งซื้อ',
                        Community: req.user,
                        community: community[0],
                        searchOrder: searchOrder,
                        timeStart: form.timeStart,
                        timeEnd: form.timeEnd,
                        communityShopName: form.communityShopName
                    });
                });
            }else{
                let selectQuery = "\
                select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
                FROM orders natural join order_lists natural join product\
                natural join people_community natural join community where \
                community_id = " + community[0].community_id + "\
                and orders.order_Status='3' and community_Shop_Name like '%" + form.communityShopName + "%' and product_Name like '%" + form.productName + "%' and DATE_FORMAT(orders.update_At,'%Y-%m') between '" + form.timeStart + "' and '" + form.timeEnd + "' group by order_lists.product_Id order by product.product_Id ASC";
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (searchOrder) {
                    res.render('community/searchOrderSummary', {
                        title: 'ค้นหายอดรวมคำสั่งซื้อ',
                        Community: req.user,
                        community: community[0],
                        searchOrder: searchOrder,
                        timeStart: form.timeStart,
                        timeEnd: form.timeEnd,
                        communityShopName: form.communityShopName,
                        productName: form.productName
                    });
                });
            }
        });
    })

module.exports = router;