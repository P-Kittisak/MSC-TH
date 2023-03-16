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

router.route('/')
    .all(function (req, res, next) {
        var summary = req.session.summary;
        var cartSummary;
        if (summary)
            cartSummary = {
                subTotal: parseInt(summary.subTotal).toFixed(2),
                total: parseInt(summary.total).toFixed(2),
                shipCost: parseInt(summary.shipCost).toFixed(2),
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
                    productTotal: parseInt(aItem.productTotal).toFixed(2)
                });
            }
        }
        req.session.showCart = showCart;
        for(let pro in showCart){
            const product = "\
            SELECT community_name,product_Id,community_Shop_Name, product_Name, product_Detail, product_Quantity, product_Price, product_Status,category_Id, category_Name\
            ,JSON_EXTRACT(main_Product_Img,'$.filename0') As productImage0\
            FROM community natural join people_community natural join product natural join product_img natural join category\
            WHERE product_Id = \'" + showCart[pro].product_Id + ' AND community_id = community_id' +'\'';
            database.RunQuery(product,Sequelize.QueryTypes.SELECT, function (resproduct) {
                if(resproduct[0].product_Quantity==0 || showCart[pro].product_Quantity != resproduct[0].product_Quantity || showCart[pro].product_Price != resproduct[0].product_Price){
                    req.flash('LimitProduct','จำนวนสินค้าในตะกร้าเกิดการเปลี่ยนแปลง กรุณาเคลียร์สินค้าในตะกร้าก่อน');
                    var Alert = req.flash('LimitProduct');
                    req.session.cart={};
                    req.session.summary = {
                        totalQuantity: 0,
                        shipCost: 0.00,
                        subTotal: 0.00,
                        total: 0.00
                    };
                    req.session.cartSummary = {};
                    req.session.showCart = {};
                    req.session.address = {};
                    const sqlCategory = '\
                    SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
                    database.RunQuery(sqlCategory,Sequelize.QueryTypes.SELECT, function (category) {
                    var cate=JSON.stringify(getNestedChildren(category,0));
                    const contextDict = {
                        title: 'ตะกร้าสินค้า',
                        customer: req.user,
                        categories:cate,
                        cart: showCart,
                        summary: cartSummary,
                        checkedCommunityShopName: '',
                        ProQuan: Alert
                    };
                        res.render('cart', contextDict);
                    });
                }
            });
        }
        req.session.cartSummary = cartSummary;
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
        const sqlStr = '\
            SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
                var cate=JSON.stringify(getNestedChildren(category,0));
                const Alert = req.flash('CommunityShopName');
                const contextDict = {
                    title: 'ตะกร้าสินค้า',
                    customer: req.user,
                    categories:cate,
                    cart: showCart,
                    summary: cartSummary,
                    checkedCommunityShopName: Alert,
                    ProQuan: ''
                };
                console.log(contextDict);
                setTimeout(function(){res.render('cart', contextDict)},250);
            });
    });

router.route('/:id/update')
    .post(function (req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('/');
        }
        var cart = req.session.cart;
        var newQuantity = parseInt(req.body[req.params.id]);
        for (var item in cart) {
            if (cart[item].product_Id == req.params.id) {
                var diff = newQuantity - cart[item].quantity;
                if (diff != 0) {
                    var summary = req.session.summary;
                    summary.totalQuantity += diff;
                    summary.subTotal = summary.subTotal + cart[item].product_Price * diff;
                    summary.total = summary.total + cart[item].product_Price * diff;
                    cart[item].productTotal = cart[item].productTotal + cart[item].product_Price * diff;
                    cart[item].quantity = newQuantity;
                }
            }
        }
        res.redirect('/cart');
    });

router.route('/:id/delete')
    .post(function (req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('/');
        }
        var cart = req.session.cart;
        var summary = req.session.summary;
        summary.totalQuantity -= cart[req.params.id].quantity;
        cart[req.params.id].quantity = 0;
        summary.subTotal = summary.subTotal - cart[req.params.id].productTotal;
        summary.total = summary.total - cart[req.params.id].productTotal;
        cart[req.params.id].productTotal = 0;
        res.redirect('/cart');
    });

router.route('/:id/add')
    .post(function (req, res, next) {
        if (!req.isAuthenticated()) {
            res.redirect('/');
        }
        req.session.cart = req.session.cart ||{};
        var cart = req.session.cart;
        req.session.summary = req.session.summary || {
                totalQuantity: 0,
                subTotal: 0.00,
                shipCost: 0.00,
                total: 0.00
            };
        var summary = req.session.summary;

        const selectQuery = '\
        SELECT product.*, category.category_Name,community_name,people_Community_Id,community_Shop_Name, JSON_EXTRACT(product_img.main_Product_Img,"$.filename0") As productImage\
        FROM community natural join people_community natural join product natural join product_img\
        INNER JOIN category\
        ON product.category_Id = category.category_Id\
        WHERE product_Id = \'' + req.params.id + ' AND community_id = community_id' +'\'';

        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (rows) {
            var plusPrice = 0.00;
            var inputQuantity = parseInt(req.body.quantity);
            //console.log(inputQuantity);
            if (cart[req.params.id]) {
                if (inputQuantity) {
                    cart[req.params.id].quantity += inputQuantity;
                    plusPrice = cart[req.params.id].product_Price * inputQuantity;
                    cart[req.params.id].productTotal += plusPrice;
                    summary.subTotal += plusPrice;
                    summary.totalQuantity += inputQuantity;
                }
                else {
                    if(cart[req.params.id].quantity+1>rows[0].product_Quantity ){
                        // req.flash('LimitProduct','เพิ่มจำนวนสินค้าสูงสุดแล้ว');
                    }
                    else{
                        cart[req.params.id].quantity++;
                        plusPrice = cart[req.params.id].product_Price;
                        cart[req.params.id].productTotal += plusPrice;
                        summary.subTotal += plusPrice;
                        summary.totalQuantity++;
                    }
                }
            }
            else {
                cart[req.params.id] = rows[0];
                if (req.body.quantity) {
                    cart[req.params.id].quantity = inputQuantity;
                    plusPrice = cart[req.params.id].product_Price * inputQuantity;
                    cart[req.params.id].productTotal = plusPrice;
                    summary.subTotal += plusPrice;
                    summary.totalQuantity += inputQuantity;
                }
                else {
                    rows[0].quantity = 1;
                    plusPrice = cart[req.params.id].product_Price;
                    cart[req.params.id].productTotal = plusPrice;
                    summary.subTotal += plusPrice;
                    summary.totalQuantity++;
                }
            }
            summary.total = parseInt(summary.subTotal);
            res.redirect('/cart');
        });
    });


module.exports = router;