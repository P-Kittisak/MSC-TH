var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt-nodejs');
const { Sequelize } = require('sequelize');
//import database module
var database = require('../config/database');

// Admin Page
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

function isAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        if (req.user.user_status == 1) { //-เมื่อ user status = 1 ให้ไปหน้า Admin
            return next();
        }
        else if (req.user.user_status == 2) { //-เมื่อ user status = 2 ให้ไปหน้า community
            res.redirect('/community');
        }
        else if (req.user.user_status == 3 || req.user.user_status == 4 || req.user.user_status == 5) {
            res.redirect('/shop');
        }
        else if (req.user.user_status == 0){ //-เมื่อ user status = 0 ให้ไปหน้า User
            res.redirect('/Account/user');
        }
    }
    res.redirect('/');
}

router.route('/')
    .get(isAdmin, function (req, res, next) {
        res.redirect('/admin/admin');
    });

router.route('/admin')
    .get(isAdmin, async function (req, res) {
        let selectQuery = "\
        select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
        FROM orders natural join order_lists natural join product\
        natural join people_community natural join community where\
        orders.order_Status='3' group by order_lists.product_Id order by product.product_Id ASC";
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (orderSummary) {
            res.render('admin/orderSummary', {
                title: 'สรุปยอดรวมคำสั่งซื้อทั้งหมด',
                admin: req.user,
                orderSummary: orderSummary
            });
        });
    })

router.route('/searchOrder')
    .post(isAdmin, async function (req, res) {
        let form = req.body;
        // console.log("timeStart: "+form.timeStart);
        // console.log("timeEnd: "+form.timeEnd);
        // console.log("communityName: "+form.communityName);   
        if (form.communityName == "" && form.productName == ""){
            let selectQuery = "\
            select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
            FROM orders natural join order_lists natural join product\
            natural join people_community natural join community where\
            orders.order_Status='3' and DATE_FORMAT(orders.update_At,'%Y-%m') between '" + form.timeStart + "' and '" + form.timeEnd + "' group by order_lists.product_Id order by product.product_Id ASC";
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (searchOrder) {
                res.render('admin/searchOrder', {
                    title: 'ค้นหายอดรวมคำสั่งซื้อ',
                    admin: req.user,
                    searchOrder: searchOrder,
                    timeStart: form.timeStart,
                    timeEnd: form.timeEnd
                });
                // console.log("1:"+searchOrder);
                // console.log("1:"+selectQuery);
            });
        }else if (form.communityName != "" && form.productName == ""){
            let selectQuery = "\
            select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
            FROM orders natural join order_lists natural join product\
            natural join people_community natural join community where\
            orders.order_Status='3' and community_name like '%" + form.communityName + "%' and DATE_FORMAT(orders.update_At,'%Y-%m') between '" + form.timeStart + "' and '" + form.timeEnd + "' group by order_lists.product_Id order by product.product_Id ASC";
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (searchOrder) {
                res.render('admin/searchOrder', {
                    title: 'ค้นหายอดรวมคำสั่งซื้อ',
                    admin: req.user,
                    searchOrder: searchOrder,
                    timeStart: form.timeStart,
                    timeEnd: form.timeEnd,
                    communityName: form.communityName
                });
                // console.log("2:"+searchOrder);
            });
        }else{
            let selectQuery = "\
            select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
            FROM orders natural join order_lists natural join product\
            natural join people_community natural join community where\
            orders.order_Status='3' and community_name like '%" + form.communityName + "%' and product_Name like '%" + form.productName + "%' and DATE_FORMAT(orders.update_At,'%Y-%m') between '" + form.timeStart + "' and '" + form.timeEnd + "' group by order_lists.product_Id order by product.product_Id ASC";
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (searchOrder) {
                res.render('admin/searchOrder', {
                    title: 'ค้นหายอดรวมคำสั่งซื้อ',
                    admin: req.user,
                    searchOrder: searchOrder,
                    timeStart: form.timeStart,
                    timeEnd: form.timeEnd,
                    communityName: form.communityName,
                    productName: form.productName
                });
                // console.log("2:"+searchOrder);
            });
        }
    })

router.route('/category')
    .get(isAdmin, async function (req, res) {
        let selectCategory = '\
            SELECT *\
            FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY ref_Category_Id ASC';
        database.RunQuery(selectCategory,Sequelize.QueryTypes.SELECT, function (categoryASC) {
            let selectCategory2 = '\
                SELECT *\
                FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(selectCategory2,Sequelize.QueryTypes.SELECT, function (category) {
                var cate=JSON.stringify(getNestedChildren(category,0));
                res.render('admin/category',{
                    title: 'หมวดหมู่สินค้า',
                    admin: req.user,
                    category: categoryASC,
                    categories: cate,
                });
            });
        });
    })

router.route('/category/addCategory')
    .post(isAdmin, function (req,res){
        let form = req.body;
        let insertCategory = 'INSERT INTO category\
            VALUES(null, ' + '\'' +
                form.categoryName + '\'' + ', \'' +
                form.refCategoryId + '\')';
            database.RunQuery(insertCategory,Sequelize.QueryTypes.INSERT, function (result){
                res.redirect('/admin/category');
        });
    })

router.route('/category/:id/deleteCategory')
    .post(isAdmin, function (req,res){
        let selectQuery = '\
            SELECT product_Id,category_Id\
            FROM category natural join product\
            WHERE category_Id = \'' + req.params.id + '\'';
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (categoryRows) {
                if (categoryRows.length > 0) {
                    let sqlStr = '\
                        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
                    database.RunQuery(categoryRows,Sequelize.QueryTypes.SELECT, function (category) {
                        var cate=JSON.stringify(getNestedChildren(category,0));
                        req.flash('CategoryError','หมวดหมู่นี้ถูกใช้งานอยู่ ไม่สามารถลบได้');
                        res.render('admin/category',{
                            title: 'หมวดหมู่สินค้า',
                            admin: req.user,
                            category: category,
                            categories: cate,
                            Checkedcategory: req.flash('CategoryError'),
                        });
                    });
                }
                else{
                let deleteCategory = '\
                    DELETE FROM category\
                    WHERE category_Id = ' + req.params.id;
                    database.RunQuery(deleteCategory,Sequelize.QueryTypes.DELETE, function (result){
                        res.redirect('/admin/category');
                });
            }
        });
    })

router.route('/category/:id/editCategory')
    .post(isAdmin, function (req,res){
        let form = req.body;
        let upDateCategory = '\
            UPDATE category\
            SET category_Name = \'' + form.categoryName + '\' \
                WHERE category_Id = ' + req.params.id;
            database.RunQuery(upDateCategory,Sequelize.QueryTypes.UPDATE, function (addRow){
                res.redirect('/admin/category');
        });
    })

router.route('/request')
    .get(isAdmin, async function (req, res) {
        let selectQuery = "\
        select * FROM add_community left join tambons on add_community.tambons_id = tambons.tambons_id\
        WHERE add_Community_Status = 0";
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (requestAddCommunity) {
            res.render('admin/requestAddCommunity', {
                title: 'คำร้องขอเพิ่มชุมชน',
                admin: req.user,
                requestAddCommunity: requestAddCommunity
            });
        });
    })

router.route('/request/confirm/:CommunityId')
    .post(isAdmin, async function (req, res) {
        let upDateCategory = '\
            UPDATE add_community\
            SET add_Community_Status = \'' + 1 + '\' \
            WHERE add_Community_Id = ' + req.params.CommunityId;
            database.RunQuery(upDateCategory,Sequelize.QueryTypes.UPDATE, function (addRow){
            let selectQuery = "\
                select * FROM add_community natural join tambons where add_Community_Id = " + req.params.CommunityId;
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (requestAddCommunity) {
                let insertAddress = '\
                    INSERT INTO community\
                    VALUES (null, ' + requestAddCommunity[0].community_code + ', \
                    \'' + requestAddCommunity[0].community_name + '\', \
                    \'' + requestAddCommunity[0].zip_code + '\', \
                    \'' + requestAddCommunity[0].tambons_id + '\')';
                    database.RunQuery(insertAddress,Sequelize.QueryTypes.INSERT, function (result){
                    res.redirect('/admin/request');
                });
            });
        });
    })

router.route('/request/cancel/:CommunityId')
    .post(isAdmin, async function (req, res) {
        let upDateCommunity = '\
            UPDATE add_community\
            SET add_Community_Status = \'' + 2 + '\' \
            WHERE add_Community_Id = ' + req.params.CommunityId;
            database.RunQuery(upDateCommunity,Sequelize.QueryTypes.UPDATE, function (result){
                res.redirect('/admin/request');
            });
        })

router.route('/changePassword')
    .get(isAdmin, async function (req, res) {
        res.render('admin/changePassword', {
            title: 'เปลี่ยนรหัสผ่าน',
            admin: req.user
        });
    })

    .post(isAdmin, function (req,res){
        let form = req.body;
        if (form.newPassword == form.repeatPassword) {
            if (bcrypt.compareSync(form.currentPassword, req.user.password)) {
                let passwordHash = bcrypt.hashSync(form.newPassword, null, null);
                let updateQuery = '\
                UPDATE users\
                SET password = \'' + passwordHash + '\' \
                WHERE user_Id = ' + req.user.user_Id;
                database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result) {
                    
                });res.redirect('/admin/admin');
            }
            else {
                //-  password wrong
                req.flash('password','รหัสผ่านเดิมไม่ถูกต้อง  กรุณากรอกรหัสผ่านใหม่อีกครั้ง');
                res.render('admin/changePassword', {
                    title: 'โปรไฟล์-เปลี่ยนรหัสผ่าน',
                    admin: req.user,
                    Checkedpass: req.flash('password'),
                });
                }
            }
        else {
            //- passwords are not matched
            req.flash('password','รหัสผ่านใหม่ไม่ตรงกัน กรุณากรอกรหัสผ่านใหม่อีกครั้ง');
            res.render('admin/changePassword', {
                title: 'โปรไฟล์-เปลี่ยนรหัสผ่าน',
                admin: req.user,
                Checkedpass: req.flash('password'),
            });
        }
    });

router.route('/tranship')
    .get(isAdmin, async function (req, res) {
        let selectQuery = "\
        select * FROM tranship_bangkok";
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (transhipBangkok) {
            res.render('admin/tranship', {
                title: 'จัดการค่าส่ง/กรุงเทพ',
                admin: req.user,
                transhipBangkok: transhipBangkok
            });
        });
    })

    .post(isAdmin, async function (req, res) {
        let form = req.body;
        let selectTranship = "\
        select * FROM tranship_bangkok";
        database.RunQuery(selectTranship,Sequelize.QueryTypes.SELECT, function (transhipBangkok) {
            for(var index = 0;index < transhipBangkok.length;index++){
                let UpdateTranship='\
                UPDATE tranship_bangkok\
                SET tranSportShip = \'' + form.tranSportShip[index] + '\',\
                    tranship = \'' + form.tranShip[index] + '\'\
                    Where tranship_Id =' + form.tranShipId[index];
                    RunQuery(UpdateTranship, function (bangkok) {
                        console.log(bangkok,UpdateTranship);
                    });
                }
                res.redirect('/admin/tranship');
            });
        })

router.route('/tranship_province')
    .get(isAdmin, async function (req, res) {
        let selectQuery = "\
        select * FROM tranship_province";
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (transhipProvince) {
            res.render('admin/tranship_province', {
                title: 'จัดการค่าส่ง/กรุงเทพ',
                admin: req.user,
                transhipProvince: transhipProvince
            });
        });
    })

    .post(isAdmin, async function (req, res) {
        let form = req.body;
        let selectTranship = "\
        select * FROM tranship_province";
        database.RunQuery(selectTranship,Sequelize.QueryTypes.SELECT, function (transhipProvince) {
            for(let index = 0;index < transhipProvince.length;index++){
                let UpdateTranship='\
                UPDATE tranship_province\
                SET tranSportShip = \'' + form.tranSportShip[index] + '\',\
                    tranship = \'' + form.tranShip[index] + '\'\
                    Where tranship_Id =' + form.tranShipId[index];
                    database.RunQuery(UpdateTranship,Sequelize.QueryTypes.UPDATE, function (Province) {
                        console.log(Province,UpdateTranship);
                    });
                }
                res.redirect('/admin/tranship_province');
            });
        })

module.exports = router;
