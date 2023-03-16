var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt-nodejs');
const { Sequelize } = require('sequelize');
//import database module
var database = require('../config/database');

// Shop Page
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

//UploadImage use of Multer
const multer = require('multer');
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
        const randomNum1 = Math.floor(Math.random() * 1000000) + 1;
        const randomNum2 = Math.floor(Math.random() * 1000000) + 1;
        // Get current date in Thailand as a number
        const options = { timeZone: 'Asia/Bangkok' };
        const thailandTime = new Date().toLocaleString('en-US', options);
        const timestamp = new Date(thailandTime).getTime() / 1000;
        // console.log(timestamp);
        const fileName = timestamp + "_" + (randomNum1 + randomNum2) + mimeExtendsion[file.mimetype];
        // console.log(fileName + "\n");

        // Convert Unix timestamp to date and time in Thailand
        // const options2 = { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
        // const thailandTime2 = new Date(timestamp * 1000).toLocaleString('en-US', options2);
        // console.log(thailandTime2);

        cb(null,fileName);
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
const storageBank=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'public/images/QR_Code')
    },
    filename:(req,file,cb)=>{
        const mimeExtendsion={
            'image/jpeg':'.jpeg',
            'image/jpg':'.jpg',
            'image/png':'.png'
        }
        let randomNum1 = Math.floor(Math.random() * 1000000) + 1;
        let randomNum2 = Math.floor(Math.random() * 1000000) + 1;
        // Get current date in Thailand as a number
        const options = { timeZone: 'Asia/Bangkok' };
        const thailandTime = new Date().toLocaleString('en-US', options);
        const timestamp = new Date(thailandTime).getTime() / 1000;
        // console.log(timestamp);
        const fileName = timestamp + mimeExtendsion[file.mimetype];
        cb(null,fileName);
    }
});
const UploadQR_Code=multer({
    storage:storageBank,
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

function isShop(req, res, next) {
    if (req.isAuthenticated()) {
        if (req.user.user_status == 3 || req.user.user_status == 4 || req.user.user_status == 5) {
            return next();
        }
        else if (req.user.user_status == 0){
            
            res.redirect('/Account/');
        }
        else if (req.user.user_status == 2) { //-เมื่อ user status = 2 ให้ไปหน้า community
            res.redirect('/community');
        }
        else if (req.user.user_status == 1) {
            res.redirect('/admin');
        }
    }
    res.redirect('/');
}

router.route('/')
    .get(isShop, function (req, res, next) {
        res.redirect('/shop/communityShop');
    });

router.route('/communityShop')
    .get(isShop, function (req, res, next) {
        let SelectCommunity= "\
        SELECT * FROM community natural join people_community\
        WHERE user_Id = " + req.user.user_Id;
            database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
                let selectQuery = "\
                    select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
                    FROM orders natural join order_lists natural join product\
                    natural join people_community natural join community where\
                    user_Id = " + req.user.user_Id + "\
                    and orders.order_Status='3' group by order_lists.product_Id order by product.product_Id ASC"
                    database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (orderSummary) {
                        res.render('shop/communityShop',{
                        title: 'ร้านค้า',
                        shop: req.user,
                        orderSummary:orderSummary,
                        community: community
                    })
                });
            });
        })

router.route('/product')
    .get(isShop, async function (req, res) {
        let SelectProductImg= "\
        SELECT *\
        ,JSON_EXTRACT(main_Product_Img,'$.filename0') As productImage FROM people_community natural join product natural join product_img natural join category\
        WHERE user_Id = " + req.user.user_Id;
        database.RunQuery(SelectProductImg,Sequelize.QueryTypes.SELECT, function (product) {
            let SelectCommunity= "\
            SELECT * FROM community natural join people_community\
            WHERE user_Id = " + req.user.user_Id;
            database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            res.render('shop/product',{
                title: 'สินค้า',
                shop: req.user,
                product: product,
                community: community
            });
        });
        // console.log(product);
    });
})

router.route('/product/addProduct')
    .get(isShop, async function (req, res) {
        let selectQuery = '\
            SELECT *\
            FROM people_community natural join community\
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (peopleCommunity){
            selectCategory = '\
                SELECT *\
                FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(selectCategory,Sequelize.QueryTypes.SELECT, function (category) {
                let SelectCommunity= "\
                    SELECT * FROM people_community natural join community\
                    WHERE user_Id = " + req.user.user_Id;
                database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
                    let cate=JSON.stringify(getNestedChildren(category,0));
                    res.render('shop/addProduct',{
                        title: 'เพิ่มสินค้า',
                        shop: req.user,
                        peopleCommunity: peopleCommunity,
                        community: community,
                        categories: cate
                });
            });
        });
    });
})
    .post(isShop,upload_Image_Product.array('image'), function(req, res, next){
        let fileNameProducts = []
        req.files.forEach((file)=> {
            fileNameProducts.push(file.filename);
        });
        let img={}
        fileNameProducts.forEach((elem, i)=> {
            img[`filename${i}`] = elem
        });
        // console.log(img);
        let insertImg = '\
            INSERT INTO product_img\
            VALUES (null,\
            \'' + JSON.stringify(img) + '\')';
            database.RunQuery(insertImg,Sequelize.QueryTypes.INSERT, function(insertResult) {
                let form = req.body;
                insertProduct = 'INSERT INTO product\
                VALUES(null, ' + '\'' +
                    form.productName + '\'' + ', \'' +
                    form.productDetail + '\', \'' +
                    form.productQuantity + '\', \'' +
                    form.productPrice + '\', \'' +
                    form.productWeight + '\', \'' +
                    insertResult[0].insertId + '\', \'' +
                    form.peopleCommunityId + '\', \'' +
                    form.category + '\', \'' +
                    0 + '\', \'' +
                    form.productStatusQuantity + '\', \'' +
                    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toJSON().slice(0, 19).replace('T', ' ') + '\', \'' +
                    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toJSON().slice(0, 19).replace('T', ' ') + '\')';
                    database.RunQuery(insertProduct,Sequelize.QueryTypes.INSERT, function (addRow){
                        res.redirect('/shop/product');
            });
        });
    });

router.route('/product/:product_Id/:product_Name/editProduct')
    .get(isShop, async function (req, res) {
        let selectQuery = "\
        SELECT community_Shop_Name,community_name,product_Id,product_Weight,product_Status_Quantity, product_Name, product_Detail, product_Quantity, product_Price, product_Status, category_Name,category_Id\
        ,JSON_EXTRACT(main_Product_Img,'$.filename0') As productImage0, JSON_EXTRACT(main_Product_Img,'$.filename1') As productImage1, JSON_EXTRACT(main_Product_Img,'$.filename2') As productImage2\
        ,JSON_EXTRACT(main_Product_Img,'$.filename3') As productImage3, JSON_EXTRACT(main_Product_Img,'$.filename4') As productImage4, JSON_EXTRACT(main_Product_Img,'$.filename5') As productImage5, JSON_EXTRACT(main_Product_Img,'$.filename6') As productImage6\
        FROM people_community natural join community natural join product natural join product_img natural join category\
        WHERE product_Id = \'" + req.params.product_Id + ' AND community_id = community_id' + '\'';
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (product){
            selectCategory = '\
                SELECT *\
                FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(selectCategory,Sequelize.QueryTypes.SELECT, function (category) {
                let SelectCommunity= "\
                    SELECT * FROM people_community natural join community\
                    WHERE user_Id = " + req.user.user_Id;
                database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
                    var cate=JSON.stringify(getNestedChildren(category,0));
                    res.render('shop/editProduct', {
                        title: 'สินค้าชุมชน',
                        shop: req.user,
                        product: product,
                        community: community,
                        categories: cate
                    });
                });
            });
        });
    })

    .post(isShop,upload_Image_Product.array('image'), function(req, res, next){
        let fileNameProducts = []
        req.files.forEach((file)=> {
            fileNameProducts.push(file.filename);
        });
        let img={}
        fileNameProducts.forEach((elem, i)=> {
            img[`filename${i}`] = elem
        });
        let imgae=JSON.stringify(img);
        let pas=JSON.parse(imgae)
        if(pas.filename0 != undefined){
            let updateImg = "\
                UPDATE product natural join product_img SET main_Product_Img= JSON_SET(main_Product_Img,'$.filename0',"+'"'+pas.filename0+'"'+"\
                ,'$.filename1',"+'"'+pas.filename1+'"'+"\
                ,'$.filename2',"+'"'+pas.filename2+'"'+"\
                ,'$.filename3',"+'"'+pas.filename3+'"'+"\
                ,'$.filename4',"+'"'+pas.filename4+'"'+"\
                ,'$.filename5',"+'"'+pas.filename5+'"'+"\
                ,'$.filename6',"+'"'+pas.filename6+'"'+"\
                ) WHERE product_Id = " + req.params.product_Id;
                database.RunQuery(updateImg,Sequelize.QueryTypes.UPDATE, function(update) {
                    let form = req.body;
                    let upDateProduct = '\
                        UPDATE product\
                        SET product_Name = \'' + form.productName + '\', \
                            product_Detail = \'' + form.productDetail + '\', \
                            product_Quantity = \'' + form.productQuantity + '\', \
                            product_Price = \'' + form.productPrice + '\', \
                            product_Weight = \'' + form.productWeight + '\', \
                            category_Id = \'' + form.category + '\', \
                            product_Status_Quantity = \'' + form.productStatusQuantity + '\', \
                            createUp = \'' + new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toJSON().slice(0, 19).replace('T', ' ') + '\' \
                            WHERE product_Id = ' + req.params.product_Id;
                        database.RunQuery(upDateProduct,Sequelize.QueryTypes.UPDATE, function (addRow){
                            res.redirect('/shop/product');
                });
            });
        }
        else{
            let form = req.body;
            let upDateProduct = '\
                UPDATE product\
                SET product_Name = \'' + form.productName + '\', \
                    product_Detail = \'' + form.productDetail + '\', \
                    product_Quantity = \'' + form.productQuantity + '\', \
                    product_Price = \'' + form.productPrice + '\', \
                    product_Weight = \'' + form.productWeight + '\', \
                    category_Id = \'' + form.category + '\', \
                    product_Status_Quantity = \'' + form.productStatusQuantity + '\', \
                    createUp = \'' + new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toJSON().slice(0, 19).replace('T', ' ') + '\' \
                    WHERE product_Id = ' + req.params.product_Id;
                database.RunQuery(upDateProduct,Sequelize.QueryTypes.UPDATE, function (addRow){
                    res.redirect('/shop/product');
            });
        }
    });

router.route('/product/:product_Id/editStatusProduct0')
    .post(isShop, function (req,res){
        let upDateProductStatus = '\
        UPDATE product\
        SET product_Status = \'' + 0 + '\', \
            createUp = \'' + new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toJSON().slice(0, 19).replace('T', ' ') + '\' \
            WHERE product_Id = ' + req.params.product_Id;
        database.RunQuery(upDateProductStatus,Sequelize.QueryTypes.UPDATE, function (addRow){
            res.redirect('/shop/product');
        });
    });

router.route('/product/:product_Id/editStatusProduct1')
    .post(isShop, function (req,res){
        let upDateProductStatus = '\
        UPDATE product\
        SET product_Status = \'' + 1 + '\', \
            createUp = \'' + new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60 * 1000).toJSON().slice(0, 19).replace('T', ' ') + '\' \
            WHERE product_Id = ' + req.params.product_Id;
        database.RunQuery(upDateProductStatus,Sequelize.QueryTypes.UPDATE, function (addRow){
            res.redirect('/shop/product');
        });
    });

router.route('/shopProfile')
    .get(isShop, async function (req, res) {
        let selectQuery = '\
            SELECT community_id,people_Community_Id,user_Id,community_Shop_Name,people_Community_Fullname,people_Community_Phone,community_name\
            FROM people_community natural join community\
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
            res.render('shop/shopProfile', {
                title: 'โปรไฟล์',
                shop: req.user,
                community: community
            });
        });
    })

    .post(isShop, function (req,res){
        let form = req.body;
        let updateQuery = '\
        UPDATE people_community natural join users\
        SET people_Community_Fullname = \'' + form.fullname + '\', \
            fullname_user = \'' + form.fullname + '\', \
            community_Shop_Name = \'' + form.communityShopName + '\', \
            people_Community_Phone = \'' + form.communityPhone + '\' \
            WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result){
            res.redirect('/shop/shopProfile');
            });
        });

router.route('/shopProfile/:username/:str/editEmail')
    .post(isShop, function (req,res){
        let form = req.body;
        let selectQuery = '\
            SELECT community_id,people_Community_Id,user_Id,community_Shop_Name,people_Community_Fullname,people_Community_Phone,community_name\
            FROM people_community natural join community\
            WHERE user_Id = ' + req.user.user_Id;
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
                if (bcrypt.compareSync(form.password, req.user.password)){
                    let selectEmail = 'SELECT *\
                        FROM users\
                        WHERE email = \'' + form.email + '\'';
                    database.RunQuery(selectEmail,Sequelize.QueryTypes.SELECT, function (emailRows) {
                        if(emailRows.length > 0) {
                            req.flash('Email', 'อีเมลถูกใช้ไปแล้ว กรุณากรอกอีเมลใหม่อีกครั้ง');
                            res.render('shop/shopProfile', {
                                title: 'โปรไฟล์',
                                shop: req.user,
                                CheckedEmail: req.flash('Email'),
                                community: community
                            })
                        }else{
                            let updateQuery = '\
                            UPDATE users\
                            SET email = \'' + form.email + '\' \
                            WHERE user_Id = ' + req.user.user_Id;
                            database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result){
                                res.redirect('/shop/shopProfile');
                            });
                        }
                    });
                    }else{
                        req.flash('Password', 'เปลี่ยนอีเมลไม่สำเร็จ พาสเวิร์ดไม่ถูกต้อง กรุณากรอกพาสเวิร์ดใหม่อีกครั้ง');
                        res.render('shop/shopProfile',{
                            title: 'โปรไฟล์',
                            shop: req.user,
                            CheckPassword: req.flash('Password'),
                            community: community
                    });
                }
            });
        });

router.route('/shopProfile/changePassword')
    .get(isShop, async function (req, res) {
        let selectQuery = '\
            SELECT *\
            FROM people_community natural join community\
            WHERE user_Id = ' + req.user.user_Id;
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
            res.render('shop/changePassword', {
                title: 'โปรไฟล์-เปลี่ยนรหัสผ่าน',
                shop: req.user,
                community: community
            });
        });
    })

    .post(isShop, function (req,res){
        let form = req.body;
        let selectQuery = '\
            SELECT *\
            FROM people_community natural join community\
            WHERE user_Id = ' + req.user.user_Id;
        if (form.newPassword == form.repeatPassword) {
            if (bcrypt.compareSync(form.currentPassword, req.user.password)) {
                let passwordHash = bcrypt.hashSync(form.newPassword, null, null);
                let updateQuery = '\
                UPDATE users\
                SET password = \'' + passwordHash + '\' \
                WHERE user_Id = ' + req.user.user_Id;
                database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result) {
                    res.redirect('/shop/shopProfile');
                }
                );
            }
            else {
                //-  password wrong
                req.flash('password','รหัสผ่านเดิมไม่ถูกต้อง  กรุณากรอกรหัสผ่านใหม่อีกครั้ง');
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
                    res.render('shop/changePassword', {
                        title: 'โปรไฟล์-เปลี่ยนรหัสผ่าน',
                        shop: req.user,
                        community: community,
                        Checkedpass: req.flash('password'),
                    });
                });
            }
        }
        else {
            //- passwords are not matched
            req.flash('password','รหัสผ่านใหม่ไม่ตรงกัน กรุณากรอกรหัสผ่านใหม่อีกครั้ง');
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (community) {
                res.render('shop/changePassword', {
                    title: 'โปรไฟล์-เปลี่ยนรหัสผ่าน',
                    shop: req.user,
                    community: community,
                    Checkedpass: req.flash('password'),
                });
            });
        }
    });

router.route('/money/bank')
    .get(isShop, async function (req, res) {
        let Selectimg= "\
        SELECT *\
        FROM people_community natural join bank\
        WHERE user_Id = " + req.user.user_Id;
        database.RunQuery(Selectimg,Sequelize.QueryTypes.SELECT, function (bank) {
            let SelectCommunity= "\
            SELECT * FROM community natural join people_community\
            WHERE user_Id = " + req.user.user_Id;
            database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            res.render('shop/bank',{
                title: 'บัญชีธนาคาร',
                shop: req.user,
                bank: bank,
                community: community
                });
            });
        });
    })

    .post(isShop,UploadQR_Code.single('image1'),function (req, res, next) {
        let img=req.file;
        let form=req.body;
        if(img !=undefined){
            let UpdateQR_Code='\
            UPDATE people_community natural join bank\
                SET bank_Number = \'' + form.bankNumber+ '\', \
                bank_Name = \'' + form.bankName + '\', \
                people_Community_Fullname = \'' + form.peopleCommunityFullname+ '\', \
                QR_Code = \'' + img.filename + '\' \
                WHERE user_Id = ' + req.user.user_Id;
                database.RunQuery(UpdateQR_Code,Sequelize.QueryTypes.UPDATE, (updateSet)=>[
                    res.redirect('/shop/money/bank')
                ]);
        }else{
            let updateBank='\
            UPDATE people_community natural join bank\
                SET bank_Number = \'' + form.bankNumber+ '\', \
                people_Community_Fullname = \'' + form.peopleCommunityFullname+ '\', \
                bank_Name = \'' + form.bankName + '\' \
                WHERE user_Id = ' + req.user.user_Id;
            database.RunQuery(updateBank,Sequelize.QueryTypes.UPDATE, (updateSet)=>[
                res.redirect('/shop/money/bank')
            ]);
        }
    });

router.route('/order/preparingToShip')
    .get(isShop, async function (req, res) {
        let SelectCommunity= "\
            SELECT * FROM people_community natural join community\
            WHERE user_Id = " + req.user.user_Id;
        database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            let selectQuery = "\
            SELECT order_Id,bank_Slip,tranship,net_Price,bank_Slip_DateTime,DATE_FORMAT(created_At, '%d-%m-%Y %T') as created_At,DATE_FORMAT(update_At, '%d-%m-%Y %T') as update_At,order_Status,tracking,DATE_FORMAT(bank_Slip_DateTime, '%d-%m-%Y %T') as bank_Slip_DateTime\
            FROM orders natural join order_lists natural join product natural join people_community\
            where orders.order_Status='2' and user_Id = " + req.user.user_Id + " group by order_Id,community_Shop_Name ORDER BY order_Id DESC";
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (order) {
                res.render('shop/orderPreparingToShip', {
                    title: 'จัดการคำสั่งซื้อ',
                    shop: req.user,
                    community:community,
                    order: order
                });
                // console.log(order);
                // console.log(selectQuery);
            });
        });
    })

router.route('/order/success')
    .get(isShop, async function (req, res) {
        let SelectCommunity= "\
            SELECT * FROM people_community natural join community\
            WHERE user_Id = " + req.user.user_Id;
        database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            let selectQuery = "\
            SELECT order_Id,bank_Slip,tranship,net_Price,bank_Slip_DateTime,DATE_FORMAT(created_At, '%d-%m-%Y %T') as created_At,DATE_FORMAT(update_At, '%d-%m-%Y %T') as update_At,order_Status,tracking,DATE_FORMAT(bank_Slip_DateTime, '%d-%m-%Y %T') as bank_Slip_DateTime\
            FROM orders natural join order_lists natural join product natural join people_community\
            where orders.order_Status='3' and user_Id = " + req.user.user_Id + " group by order_Id,community_Shop_Name ORDER BY order_Id DESC";
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (order) {
                res.render('shop/orderSuccess', {
                    title: 'จัดการคำสั่งซื้อ',
                    shop: req.user,
                    community:community,
                    order: order
                });
            });
        });
    })

router.route('/order/cancel')
    .get(isShop, async function (req, res) {
        let SelectCommunity= "\
            SELECT * FROM people_community natural join community\
            WHERE user_Id = " + req.user.user_Id;
        database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            let selectQuery = "\
            SELECT order_Id,bank_Slip,tranship,net_Price,bank_Slip_DateTime,DATE_FORMAT(created_At, '%d-%m-%Y %T') as created_At,DATE_FORMAT(update_At, '%d-%m-%Y %T') as update_At,order_Status,tracking,DATE_FORMAT(bank_Slip_DateTime, '%d-%m-%Y %T') as bank_Slip_DateTime\
            FROM orders natural join order_lists natural join product natural join people_community\
            where orders.order_Status='4' and user_Id = " + req.user.user_Id + " group by order_Id,community_Shop_Name ORDER BY order_Id DESC";
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (order) {
                res.render('shop/orderCancel', {
                    title: 'จัดการคำสั่งซื้อ',
                    shop: req.user,
                    community:community,
                    order: order
                });
            });
        });
    })

router.route('/order')
    .get(isShop, async function (req, res) {
        let SelectCommunity= "\
            SELECT * FROM people_community natural join community\
            WHERE user_Id = " + req.user.user_Id;
        database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            let selectQuery = "\
            SELECT order_Id,bank_Slip,tranship,net_Price,bank_Slip_DateTime,DATE_FORMAT(created_At, '%d-%m-%Y %T') as created_At,DATE_FORMAT(update_At, '%d-%m-%Y %T') as update_At,order_Status,tracking,DATE_FORMAT(bank_Slip_DateTime, '%d-%m-%Y %T') as bank_Slip_DateTime\
            FROM orders natural join order_lists natural join product natural join people_community\
            where order_Status != 4 and order_Status != 3 and user_Id = " + req.user.user_Id + " group by order_Id,community_Shop_Name ORDER BY order_Id DESC";
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (order) {
                res.render('shop/orderShop', {
                    title: 'จัดการคำสั่งซื้อ',
                    shop: req.user,
                    community:community,
                    order: order
                });
            });
        });
    })

router.route('/order/cancel/:orderId')
    .post(isShop, function (req,res){
        let form = req.body;
        let upDateOrder = '\
            UPDATE orders\
            SET comment = \'' + form.comment + '\', \
                update_At = now()\, \
                order_Status = \'' + 4 + '\' \
                WHERE order_Id = ' + req.params.orderId;
            database.RunQuery(upDateOrder,Sequelize.QueryTypes.UPDATE, function (Row){
                let Selectorder= "\
                    SELECT * FROM order_lists natural join product\
                    WHERE order_Id = " + req.params.orderId;
                    database.RunQuery(Selectorder,Sequelize.QueryTypes.SELECT, function (rows) {
                        for (var item in rows) {
                            updateQuery='UPDATE product\
                                SET product_Quantity = (product_Quantity + ' + rows[item].quantity  +
                                ') WHERE product_Id = ' + rows[item].product_Id;
                            database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function(result2){
                        });
                    }res.redirect('/shop/order/cancel');
                });
            });
        })

router.route('/order/confirm/:orderId')
    .post(isShop, function (req,res){
        let upDateOrder = '\
            UPDATE orders\
            SET update_At = now()\, \
                order_Status = \'' + 2 + '\' \
                WHERE order_Id = ' + req.params.orderId;
            database.RunQuery(upDateOrder,Sequelize.QueryTypes.UPDATE, function (Row){
                    res.redirect('/shop/order/preparingToShip');
            });
        })

router.route('/order/error/:orderId')
    .post(isShop, function (req,res){
        let form = req.body;
        let upDateOrder = '\
            UPDATE orders\
            SET comment = \'' + form.comment + '\', \
                update_At = now()\, \
                order_Status = \'' + 5 + '\' \
                WHERE order_Id = ' + req.params.orderId;
            database.RunQuery(upDateOrder,Sequelize.QueryTypes.UPDATE, function (Row){
                res.redirect('/shop/order');
                // console.log(upDateOrders);
            });
        })

router.route('/order/tracking/:orderId')
    .post(isShop, function (req,res){
        let form = req.body;
        let upDateOrder = '\
            UPDATE orders\
            SET tracking = \'' + form.tracking + '\', \
                update_At = now()\, \
                order_Status = \'' + 3 + '\' \
                WHERE order_Id = ' + req.params.orderId;
            database.RunQuery(upDateOrder,Sequelize.QueryTypes.UPDATE, function (Row){
                res.redirect('/shop/order/success');
            });
        })
router.route('/order/editTracking/:orderId')
    .post(isShop, function (req,res){
        form = req.body;
        let upDateOrder = '\
            UPDATE orders\
            SET update_At = now()\, \
                tracking = \'' + form.tracking + '\' \
                WHERE order_Id = ' + req.params.orderId;
            database.RunQuery(upDateOrder,Sequelize.QueryTypes.UPDATE, function (Row){
                res.redirect('/shop/order/success');
            });
        })

router.route('/order/detail/:order_id')
    .get(isShop, async function (req, res) {
        let SelectCommunity= "\
            SELECT * FROM people_community natural join community\
            WHERE user_Id = " + req.user.user_Id;
        database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            let selectQuery = "\
            SELECT order_Id,address.fullname,address.phone,address,provinces_name,amphures_name,tambons_name,zip_code,bank_Slip,bank_Slip_DateTime,tranship,net_Price\
            ,DATE_FORMAT(created_At, '%d-%m-%Y %T') as created_At,DATE_FORMAT(update_At, '%d-%m-%Y %T') as update_At,order_Status,tracking,comment\
            FROM order_lists natural join orders natural join product natural join address\
            natural join provinces natural join amphures natural join tambons\
            where order_Id = " + req.params.order_id + " and people_Community_Id = " + community[0].people_Community_Id + " group by order_Id";
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (order) {
                    let sqlStr = "\
                    SELECT *,JSON_EXTRACT(main_Product_Img,'$.filename0') As productImage FROM product natural join (Select order_Id,SUM(price*quantity) as TotalPrice from order_lists group by order_Id) as Tsum natural join order_lists\
                    natural join category natural join product_img natural join people_community natural join community where community_id = community_id and order_Id = " + req.params.order_id;
                    database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (product) {
                res.render('shop/orderShopDetail', {
                    title: 'รายละเอียดคำสั่งซื้อ',
                    shop: req.user,
                    product: product,
                    community:community,
                    order: order
                    });
                });
            });
        });
    })

router.route('/money/orderSummary')
    .get(isShop, async function (req, res) {
        let SelectCommunity= "\
            SELECT * FROM people_community natural join community\
            WHERE user_Id = " + req.user.user_Id;
        database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            let selectQuery = "\
            select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
            FROM orders natural join order_lists natural join product\
            natural join people_community natural join community where\
            user_Id = " + req.user.user_Id + "\
            and orders.order_Status='3' group by order_lists.product_Id order by product.product_Id ASC"
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (orderSummary) {
                res.render('shop/orderSummary', {
                    title: 'สรุปยอดรวมคำสั่งซื้อ',
                    shop: req.user,
                    community:community,
                    orderSummary: orderSummary
                });
            });
        });
    })

router.route('/money/orderSummary/searchOrder')
    .post(isShop, async function (req, res) {
        let form = req.body;
        let SelectCommunity= "\
            SELECT * FROM people_community natural join community\
            WHERE user_Id = " + req.user.user_Id;
        database.RunQuery(SelectCommunity,Sequelize.QueryTypes.SELECT, function (community) {
            if (form.productName == ""){
                let selectQuery = "\
                select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
                FROM orders natural join order_lists natural join product\
                natural join people_community natural join community where\
                user_Id = " + req.user.user_Id + "\
                and orders.order_Status='3' and DATE_FORMAT(orders.update_At,'%Y-%m') between '" + form.timeStart + "' and '" + form.timeEnd + "' group by order_lists.product_Id order by product.product_Id ASC";
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (orderSummary) {
                    res.render('shop/searchOrderSummary', {
                        title: 'ค้นหายอดรวมคำสั่งซื้อ',
                        shop: req.user,
                        community:community,
                        orderSummary: orderSummary,
                        timeStart: form.timeStart,
                        community:community,
                        timeEnd: form.timeEnd
                    });
                    // console.log("1:"+searchOrder);
                    // console.log("1:"+selectQuery);
                });
            }else{
                let selectQuery = "\
                select community_name,community_Shop_Name,product_Name,SUM(order_lists.price*order_lists.quantity) as TotalPrice,SUM(order_lists.quantity) as TotalQuantity\
                FROM orders natural join order_lists natural join product\
                natural join people_community natural join community where\
                user_Id = " + req.user.user_Id + "\
                and orders.order_Status='3' and product_Name like '%" + form.productName + "%' and DATE_FORMAT(orders.update_At,'%Y-%m') between '" + form.timeStart + "' and '" + form.timeEnd + "' group by order_lists.product_Id order by product.product_Id ASC";
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (orderSummary) {
                    res.render('shop/searchOrderSummary', {
                        title: 'ค้นหายอดรวมคำสั่งซื้อ',
                        shop: req.user,
                        community:community,
                        orderSummary: orderSummary,
                        timeStart: form.timeStart,
                        timeEnd: form.timeEnd,
                        communityName: form.communityName,
                        productName: form.productName
                    });
                    // console.log("2:"+searchOrder);
                });
            }
        });
    })

module.exports = router;