var express = require('express');
var router = express.Router();
const { Sequelize } = require('sequelize');
//import database module
var database = require('../config/database');
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

function isLoggedIn(req, res, next) {
        if (req.isAuthenticated()) {
            if (req.session.cart){
                if (req.session.summary.totalQuantity > 0) {
                    return next();
                }
                res.redirect('/cart');
            }
            else{
                res.redirect('/cart');
            }
        }
        req.session.inCheckOut = true;
        res.redirect('/login');
    }

router.route('/')
    .get(isLoggedIn,function (req, res, next) {
        req.session.address = {};
        res.redirect('/checkout/delivery');
    });

router.route('/delivery')
    .get(isLoggedIn, function (req, res) {
        if(req.user.user_status != 0){
            res.redirect('/Account/');
        }
        // console.log(req.session.summary.totalQuantity);
        // console.log(req.session.cart);
        req.session.address = {};
        let selectQuery = '\
                SELECT *\
                FROM provinces';
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (provinces) {
            let sqlStr = '\
                SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
                database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
            // show addresses
                let selectAddress = '\
                    SELECT address_Id,fullname,phone,address,provinces_name,amphures_name,tambons_name,zip_code\
                    FROM address natural join provinces natural join amphures natural join tambons\
                    WHERE user_Id = ' + req.user.user_Id + ';';
                    database.RunQuery(selectAddress,Sequelize.QueryTypes.SELECT, function (rows) {
                        var summary = req.session.summary;
                        var cartSummary;
                        if (summary)
                            cartSummary = {
                                subTotal: summary.subTotal.toFixed(2),
                                total: summary.total.toFixed(2),
                                shipCost: summary.shipCost.toFixed(2),
                                totalQuantity: summary.totalQuantity
                            };
                        req.session.cartSummary = cartSummary;
                        req.session.address = rows;
                        // console.log(req.session.address);
                        var cate=JSON.stringify(getNestedChildren(category,0));

                        let contextDict = {
                            title: 'คำสั่งซื้อ - เลือกที่อยู่',
                            addresses: rows,
                            provinces: provinces,
                            customer: req.user,
                            categories:cate,
                            cart: req.session.showCart,
                            summary: cartSummary
                        };
                        res.render('checkout/delivery', contextDict);
                    });
                });
            });
    });

router.route('/delivery/new')
    .post(function (req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('/');
        }
        // add address
        let form = req.body;
        let insertAddress = '\
            INSERT INTO address\
            VALUES (null, ' + req.user.user_Id + ', \
            \'' + form.fullname + '\', \
            \'' + form.phone + '\', \
            \'' + form.address + '\', \
            \'' + form.Province + '\', \
            \'' + form.Amphure + '\', \
            \'' + form.Tambon + '\')';
        database.RunQuery(insertAddress,Sequelize.QueryTypes.INSERT, function (result) {
            let selectQuery = '\
            SELECT address_Id,fullname,phone,address,provinces_name,amphures_name,tambons_name,zip_code\
            FROM address natural join provinces natural join amphures natural join tambons\
            WHERE user_Id = ' + req.user.user_Id + ' and address_Id = ' + result[0].insertId;
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (rows) {
                req.session.address = {
                    address_Id: rows[0].address_Id,
                    fullname: rows[0].fullname,
                    phone: rows[0].phone,
                    address: rows[0].address,
                    provinces_name: rows[0].provinces_name,
                    amphures_name: rows[0].amphures_name,
                    tambons_name: rows[0].tambons_name,
                    zip_code: rows[0].zip_code
                };
            // console.log(req.session.address);

            res.redirect('/checkout/confirm');
        });
    });
});

router.route('/delivery/:id')
    .post(function (req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('/');
        }
        let selectAddress = '\
            SELECT *\
            FROM address natural join provinces natural join amphures natural join tambons\
            WHERE address_Id = ' + req.params.id;
        database.RunQuery(selectAddress,Sequelize.QueryTypes.SELECT, function (rows) {
            req.session.address = rows[0];
            // console.log(req.session.address);
            res.redirect('/checkout/confirm');
        });
    });

router.route('/confirm')
    .get(isLoggedIn, function (req, res) {
        if (!req.isAuthenticated()) {
            res.redirect('/');
        }
        //show current cart
        //Order
        if(req.user.user_status != 0){
            res.redirect('/Account/');
        }
        var summary = req.session.summary;
        var cartSummary;
        if (summary)
            cartSummary = {
                subTotal: summary.subTotal.toFixed(2),
                total: summary.total.toFixed(2),
                shipCost: summary.shipCost.toFixed(2),
                totalQuantity:summary.totalQuantity
            };

        var cart = req.session.cart;
        var showCart = [];

        for (var item in cart) {
            var aItem = cart[item];
            if (cart[item].quantity > 0) {
                showCart.push({
                    product_Id: aItem.product_Id,
                    community_name: aItem.community_name,
                    people_Community_Id: aItem.people_Community_Id,
                    community_Shop_Name: aItem.community_Shop_Name,
                    product_Name: aItem.product_Name,
                    product_Quantity: aItem.product_Quantity,
                    product_Detail: aItem.product_Detail,
                    product_Price: aItem.product_Price,
                    category_Name: aItem.category_Name,
                    quantity: aItem.quantity,
                    product_Weight: aItem.product_Weight,
                    productImage: aItem.productImage.replace(/"/g, ''),
                    productTotal: aItem.productTotal.toFixed(2)
                });
            }
        }
        var ship=0.00;
        var tranship=0;
        req.session.cartSummary = cartSummary;
        for(let pro in showCart){
            let product = "\
            SELECT community_name,product_Id,community_Shop_Name, product_Name, product_Detail, product_Quantity, product_Price, product_Status,category_Id, category_Name\
            ,JSON_EXTRACT(main_Product_Img,'$.filename0') As productImage0\
            FROM community natural join people_community natural join product natural join product_img natural join category\
            WHERE product_Id = \'" + showCart[pro].product_Id + ' AND community_id = community_id' +'\'';
            database.RunQueryPromise(product,Sequelize.QueryTypes.SELECT, function (resproduct) {
                let Tran="Select * From tranship_bangkok;"
                database.RunQueryPromise(Tran,Sequelize.QueryTypes.SELECT,function (Bangkok){
                    let TranP="SELECT * FROM tranship_province;"
                    database.RunQueryPromise(TranP,Sequelize.QueryTypes.SELECT,function (Province){
                        if(resproduct[0].product_Quantity==0 || showCart[pro].product_Quantity != resproduct[0].product_Quantity || showCart[pro].product_Price != resproduct[0].product_Price){
                            req.flash('LimitProduct','จำนวนสินค้าในตะกร้าเกิดการเปลี่ยนแปลง กรุณาเคลียร์สินค้าในตะกร้าก่อน');
                            req.session.cart={};
                            req.session.summary = {
                                totalQuantity: 0,
                                subTotal: 0.00,
                                shipCost: 0.00,
                                total: 0.00
                            };
                            req.session.cartSummary = {};
                            req.session.showCart = {};
                            req.session.address = {};
                        }
                        else{
                            ship+=showCart[pro].product_Weight*showCart[pro].quantity;
                            // console.log(Bangkok[0].tranSportShip);
                            if(req.session.address.provinces_name=='กรุงเทพมหานคร')
                                if(ship<=Bangkok[0].tranSportShip){
                                    tranship+=Bangkok[0].tranship;
                                }
                                else if(ship<=Bangkok[1].tranSportShip){
                                    tranship+=Bangkok[1].tranship;
                                }
                                else if(ship<=Bangkok[2].tranSportShip){
                                    tranship+=Bangkok[2].tranship;
                                }
                                else if(ship<=Bangkok[3].tranSportShip){
                                    tranship+=Bangkok[3].tranship;
                                }
                                else if(ship<=Bangkok[4].tranSportShip){
                                    tranship+=Bangkok[4].tranship;
                                }
                                else if(ship<=Bangkok[5].tranSportShip){
                                    tranship+=Bangkok[5].tranship;
                                }
                                else{
                                    tranship+=Bangkok[6].tranship;
                                }
                            else{
                                if(ship<=Province[0].tranSportShip){
                                    tranship+=Province[0].tranship;
                                }
                                else if(ship<=Province[1].tranSportShip){
                                    tranship+=Province[1].tranship;
                                }
                                else if(ship<=Province[2].tranSportShip){
                                    tranship+=Province[2].tranship;
                                }
                                else if(ship<=Province[3].tranSportShip){
                                    tranship+=Province[3].tranship;
                                }
                                else if(ship<=Province[4].tranSportShip){
                                    tranship+=Province[4].tranship;
                                }
                                else if(ship<=Province[5].tranSportShip){
                                    tranship+=Province[5].tranship;
                                }
                                else{
                                    tranship+=Province[6].tranship;
                                }
                            }
                            req.session.cartSummary.shipCost=tranship;
                            req.session.cartSummary.total = summary.subTotal;
                            // console.log("ship = "+ship);
                            // console.log("tranship = "+tranship);
                            // console.log("shipCost = "+showCart[pro].product_Weight*showCart[pro].quantity);
                            // console.log("Cost = "+summary.total);
                            // console.log("showCart = "+showCart[pro].quantity);
                        }
                    });
                });
            });
        }
        for (var item in req.session.cart) {
            //console.log(item);
            if (req.session.cart[item].quantity > 0){
                // console.log(showCart[0].people_Community_Id);
                if(showCart.length >1){
                    if(showCart[0].people_Community_Id != req.session.cart[item].people_Community_Id){
                        req.flash('CommunityShopName', '!!! สินค้าในตะกร้ามีมากกว่า 1 ร้านไม่สามารถทำการชำระเงินได้');
                    }
                }
            }
        }
        let sqlStr = '\
            SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
                var cate=JSON.stringify(getNestedChildren(category,0));
                let contextDict = {
                    title: 'ยืนยันคำสั่งซื้อ',
                    cart: req.session.showCart,
                    summary: req.session.cartSummary,
                    address: req.session.address,
                    customer: req.user,
                    categories:cate,
                    checkedCommunityShopName: req.flash('CommunityShopName'),
                    showWhy:req.flash('refresh'),
                    ProQuan:req.flash('LimitProduct')
                };
                console.log(contextDict);
                //res.render('checkout/confirm', contextDict);
                setTimeout(function(){res.render('checkout/confirm', contextDict)},500);
            });
    });

router.route('/refresh')
    .get(isLoggedIn, function (req, res) {
        let sqlStr = '\
            SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
                var cate=JSON.stringify(getNestedChildren(category,0));
                let contextDict = {
                    title: 'ยืนยันคำสั่งซื้อ',
                    cart: req.session.showCart,
                    summary: req.session.cartSummary,
                    address: req.session.address,
                    customer: req.user,
                    categories:cate,
                    checkedCommunityShopName: req.flash('CommunityShopName'),
                    showWhy:req.flash('refresh'),
                    ProQuan:req.flash('LimitProduct')
                };
                // console.log(contextDict);
                //res.render('checkout/confirm', contextDict);
                setTimeout(function(){res.render('checkout/confirm1', contextDict)},250);
            });
        });

router.route('/order')
    .get(isLoggedIn, function (req, res) {
        let insertOrder = '\
            INSERT INTO orders\
            VALUES(null, ' +
            req.session.address.address_Id + ', ' +
            null + ', ' +
            req.session.cartSummary.shipCost + ', ' +
            req.session.cartSummary.total + ', ' +
            null + ', ' +
            'now(),now(), ' +
            '0' + ', ' +
            null +', '+ null + ')';
        database.RunQuery(insertOrder,Sequelize.QueryTypes.INSERT, function (rows) {
            for (var item in req.session.cart) {
                if (req.session.cart[item].quantity > 0) {
                    let insertOderLists = '\
                        INSERT INTO `order_lists`\
                        VALUES(' +
                        rows[0].insertId + ', ' +
                        req.session.cart[item].product_Id + ', ' +
                        req.session.cart[item].product_Price + ', ' +
                        req.session.cart[item].quantity  + ');';
                        database.RunQuery(insertOderLists,Sequelize.QueryTypes.INSERT, function (result) {
                            });
                            let updateQuery='UPDATE product\
                                SET product_Quantity = (product_Quantity - ' + req.session.cart[item].quantity  +
                                ') WHERE product_Id = ' + req.session.cart[item].product_Id;
                            database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function(result2){
                        });
                }
            }
            //view order
            //get order info
                let selectQuery = "\
                SELECT order_Id,tranship,fullname,address,provinces_name,amphures_name,tambons_name,zip_code,phone,created_At,update_At,net_Price,bank_Slip,bank_Slip_DateTime,tracking\
                FROM orders natural join address\
                natural join provinces natural join amphures\
                natural join tambons where provinces_id=provinces_id\
                and tambons_id=tambons_id and user_Id = " + req.user.user_Id + " and order_Id = " + rows[0].insertId;

                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (order) {
                    let sqlStr = "\
                    SELECT *,JSON_EXTRACT(main_Product_Img,'$.filename0') As productImage FROM product natural join (Select order_Id,SUM(price*quantity) as TotalPrice from order_lists group by order_Id) as Tsum natural join order_lists\
                    natural join category natural join product_img natural join people_community natural join community where order_Id = " + order[0].order_Id;
                    database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (product) {
                        let sqlCategory = '\
                        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
                        database.RunQuery(sqlCategory,Sequelize.QueryTypes.SELECT, function (category) {
                        //clear cart
                        req.session.cart = {};
                        req.session.summary = {
                            totalQuantity: 0,
                            subTotal: 0.00,
                            shipCost: 0.00,
                            total: 0.00
                        };
                        req.session.cartSummary = {};
                        req.session.showCart = {};
                        req.session.address = {};
                        //get order info
                        var cate=JSON.stringify(getNestedChildren(category,0));
                        let contextDict = {
                            title: 'Order #' + rows[0].insertId,
                            customer: req.user,
                            product: product,
                            categories:cate,
                            order: order[0]
                        };
                        console.log(contextDict);
                        setTimeout(function(){res.render('checkout/confirmOrder', contextDict)},250);
                        //res.render('checkout/confirmOrder', contextDict);
                    });
                });
            });
        });
    });

router.route('/delivery/address/:provinces_id')
    .get(isLoggedIn, function (req, res) {
        let selectQuery = '\
            SELECT *\
            FROM amphures where province_id='+req.params.provinces_id;
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (amphures) {
                res.send(amphures);
        });
    });
    
router.route('/delivery/address/:provinces_id/:amphure_id')
    .get(isLoggedIn, function (req, res) {
        let selectQuery = '\
            SELECT *\
            FROM  tambons Where amphure_id='+req.params.amphure_id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (tambons) {
            res.send(tambons);
        });
    });

module.exports = router;