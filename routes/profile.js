var express = require('express');
var router = express.Router();
const { Sequelize } = require('sequelize');
//import database module
var database = require('../config/database');
const CartData = require('../routes/modules');

var bcrypt = require('bcrypt-nodejs');
const multer = require('multer');
const storageBank=multer.diskStorage({
    destination:(req,file,cb)=>{
        cb(null,'public/images/slip')
    },
    filename:(req,file,cb)=>{
        const mimeExtendsion={
            'image/jpeg':'.jpeg',
            'image/jpg':'.jpg',
            'image/png':'.png'
        }
        cb(null,file.fieldname+'-'+Date.now()+mimeExtendsion[file.mimetype]);
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
        if (req.user.user_status == 0) { //-เมื่อ user status = 1 ให้ไปหน้า Admin
            return next();
        }else if (req.user.user_status == 2) { //-เมื่อ user status = 2 ให้ไปหน้า community
            res.redirect('/community');
        }
        else if (req.user.user_status == 3 || req.user.user_status == 4 || req.user.user_status == 5) {
            res.redirect('/shop');
        }
        else if (req.user.user_status == 1){ //-เมื่อ user status = 0 ให้ไปหน้า User
            res.redirect('/admin');
        }
    }
    res.redirect('/');
}

router.route('/')
    .get(isLoggedIn, function (req, res, next) {
        res.redirect('/Account/user');
    });

router.route('/user') //- หน้า Profile user
    .get(isLoggedIn, async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlStr = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
        database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
            var cate=JSON.stringify(getNestedChildren(category,0));
            contextDict.title= req.user.username, //-ชื่อ title web จะเป็นชื่อ username ของ user คนนั้นๆ
            contextDict.customer= req.user, //-ส่งค่า req.user ไปที่ตัวแปร customer 
            contextDict.categories= cate,
            res.render('profile/profile', contextDict);
        });
    })

router.route('/user/address') //- หน้า Address ของ user
    .get(isLoggedIn, async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlStr = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
        database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
            const selectQuery = '\
                SELECT address_Id,fullname,phone,address,provinces_name,amphures_name,tambons_name,zip_code\
                FROM address natural join provinces natural join amphures natural join tambons\
                WHERE user_Id = ' + req.user.user_Id; //- ดึงข้อมูลที่อยู่ของ user 
            var cate=JSON.stringify(getNestedChildren(category,0));
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (addresses) {
                contextDict.title= req.user.username,
                contextDict.customer= req.user, //-ส่งค่า req.user ไปที่ตัวแปร customer 
                contextDict.addresses= addresses, //-เอาค่าของ function addresses ไปเก็บที่ตัวแปร addresses 
                contextDict.categories= cate,
                contextDict.address= req.flash('Address'),
                res.render('profile/address', contextDict);
            });
        });
    });

router.route('/user/address/:id/editAddress')
    .get(isLoggedIn, async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlStr = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
                let selectAddress = '\
                SELECT *\
                FROM address natural join provinces natural join amphures natural join tambons\
                WHERE address_Id = ' + req.params.id + ' and user_Id = ' + req.user.user_Id;
                database.RunQuery(selectAddress,Sequelize.QueryTypes.SELECT, function (address){
                    let selectQuery = '\
                        SELECT *\
                        FROM provinces';
                if (address.length == 0) {
                    res.redirect('/Account/user/address');
                }
                
                var cate=JSON.stringify(getNestedChildren(category,0));
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (provinces) {
                contextDict.summary= req.user.username,
                contextDict.customer= req.user,
                contextDict.addresses= address[0],
                contextDict.provinces= provinces,
                contextDict.categories= cate,
                res.render('profile/editAddress', contextDict);
            });
        });
    });
})

    .post(isLoggedIn, function (req,res){
        let form = req.body;
        let updateQuery = '\
            UPDATE address\
            SET fullname = \'' + form.fullname + '\', \
                address = \'' + form.address + '\', \
                provinces_id = \'' + form.Province + '\', \
                amphures_id = \'' + form.Amphure + '\', \
                tambons_id = \'' + form.Tambon + '\' \
            WHERE address_Id = ' + req.params.id;
        database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result){
            res.redirect('/Account/user/address');
        });
    });

router.route('/user/address/:id/Deleteaddress')
    .post(isLoggedIn, function (req, res, next) {
        let selectQuery = '\
            SELECT order_Id,address_Id\
            FROM orders\
            WHERE address_Id = \'' + req.params.id + '\'';
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (address_orders) {
                if (address_orders.length > 0) {
                    database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (result) {
                        req.flash('Address','ไม่สามารถลบได้เนื่องจากใช้งานอยู่ในหมายเลขคำสั่งซื้อของคุณ');
                        res.redirect('/Account/user/address');
                    });
                }else{
                    let deleteAddress = '\
                        DELETE FROM address\
                        WHERE address_Id = ' + req.params.id;
                    database.RunQuery(deleteAddress,Sequelize.QueryTypes.DELETE, function (result){
                        res.redirect('/Account/user/address');
                    });
                }
            });
        });

router.route('/user/address/addAddress')
    .get(isLoggedIn, async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlStr = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
            var cate=JSON.stringify(getNestedChildren(category,0));
            let selectQuery = '\
                SELECT *\
                FROM provinces';
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (provinces) {
                contextDict.title= req.user.username,
                contextDict.customer= req.user,
                contextDict.provinces= provinces,
                contextDict.categories= cate,
                res.render('profile/addAddress', contextDict);
            });
        });
    })

    .post(isLoggedIn, function (req,res){
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
        database.RunQuery(insertAddress,Sequelize.QueryTypes.INSERT, function (result){
            res.redirect('/Account/user/address');
        });
    });

router.route('/user/changePassword')
    .get(isLoggedIn, async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlStr = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
                var cate=JSON.stringify(getNestedChildren(category,0));
                contextDict.title= req.user.username,
                contextDict.customer= req.user,
                contextDict.categories= cate,
                res.render('profile/changePassword', contextDict);
        });
    })

    .post(isLoggedIn, async function (req, res) {
        let form = req.body;
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlStr = '\
            SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
                database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
                var cate=JSON.stringify(getNestedChildren(category,0));
                if (form.newPassword == form.repeatPassword) {
                    if (bcrypt.compareSync(form.currentPassword, req.user.password)) {
                        let passwordHash = bcrypt.hashSync(form.newPassword, null, null);
                        let updateQuery = '\
                        UPDATE users\
                        SET password = \'' + passwordHash + '\' \
                        WHERE user_Id = ' + req.user.user_Id;
                        database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result) {
                            res.redirect('/Account/');
                        }
                        );
                    }
                    else {
                        //-  password wrong
                            req.flash('password','รหัสผ่านเดิมไม่ถูกต้อง  กรุณากรอกรหัสผ่านใหม่อีกครั้ง');
                            contextDict.title= req.user.username,
                            contextDict.customer= req.user,
                            contextDict.categories= cate,
                            contextDict.Checkedpass= req.flash('password'),
                            res.render('profile/changePassword', contextDict);
                        }
                    }
                    else {
                        //- passwords are not matched
                        req.flash('password','รหัสผ่านใหม่ไม่ตรงกัน กรุณากรอกรหัสผ่านใหม่อีกครั้ง');
                        contextDict.title= req.user.username,
                        contextDict.customer= req.user,
                        contextDict.categories=cate,
                        contextDict.Checkedpass= req.flash('password'),
                        res.render('profile/changePassword', contextDict);
                    }
                });
            });

router.route('/user/edit')
    .get(isLoggedIn, async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlStr = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
                var cate=JSON.stringify(getNestedChildren(category,0));
                contextDict.title= req.user.username,
                contextDict.customer= req.user,
                contextDict.categories=cate,
                res.render('profile/edit', contextDict);
        });
    })
    .post(isLoggedIn, function (req,res){
        let form = req.body;
        let updateQuery = '\
        UPDATE users\
        SET fullname_user = \'' + form.fullname + '\' \
        WHERE user_Id = ' + req.user.user_Id;
        database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result){
            res.redirect('/Account/');
            });
        });

router.route('/user/editEmail')
    .post(isLoggedIn,async function (req,res){
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let form = req.body;
        let sqlStr = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
            var cate=JSON.stringify(getNestedChildren(category,0));
            if (bcrypt.compareSync(form.password, req.user.password)){
                let selectQuery = 'SELECT *\
                    FROM users\
                    WHERE email = \'' + form.email + '\'';
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (emailRows) {
                    if(emailRows.length > 0) {
                        req.flash('Email', 'อีเมลถูกใช้ไปแล้ว กรุณากรอกอีเมลใหม่อีกครั้ง');
                        contextDict.title= req.user.username,
                        contextDict.customer= req.user,
                        contextDict.categories=cate,
                        contextDict.CheckedEmail= req.flash('Email'),
                        res.render('profile/edit', contextDict);
                    }else{
                        let updateQuery = '\
                        UPDATE users\
                        SET email = \'' + form.email + '\' \
                        WHERE user_Id = ' + req.user.user_Id;
                        database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function (result){
                            res.redirect('/Account/');
                        });
                    }
                });
            }else{
                req.flash('Password', 'พาสเวิร์ดไม่ถูกต้อง กรุณากรอกพาสเวิร์ดใหม่อีกครั้ง');
                contextDict.title= req.user.username,
                contextDict.customer= req.user,
                contextDict.categories= cate,
                contextDict.CheckPassword= req.flash('Password'),
                res.render('profile/edit', contextDict);
            }
        });
    });

router.route('/user/address/:id/editAddress/:provinces_id')
    .get(isLoggedIn, async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let selectQuery = '\
            SELECT *\
            FROM amphures where province_id='+req.params.provinces_id;
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (amphures) {
                res.send(amphures);
        });
    });
    
router.route('/user/address/:id/editAddress/:provinces_id/:amphure_id')
    .get(isLoggedIn, async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let selectQuery = '\
            SELECT *\
            FROM  tambons Where amphure_id='+req.params.amphure_id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (tambons) {
            res.send(tambons);
        });
    });

router.route('/user/address/addAddress/:provinces_id')
    .get(isLoggedIn, function (req, res) {
        let selectQuery = '\
            SELECT *\
            FROM amphures where province_id='+req.params.provinces_id;
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (amphures) {
                res.send(amphures);
        });
    });
    
router.route('/user/address/addAddress/:provinces_id/:amphure_id')
    .get(isLoggedIn, function (req, res) {
        let selectQuery = '\
            SELECT *\
            FROM  tambons Where amphure_id='+req.params.amphure_id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (tambons) {
            res.send(tambons);
        });
    });

router.route('/order') //- หน้า order user
    .get(isLoggedIn, async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let selectOrder = "\
            SELECT *,DATE_FORMAT(update_At, '%d-%m-%Y %T') as update_At,DATE_FORMAT(created_At, '%d-%m-%Y %T') as created_At,DATE_FORMAT(bank_Slip_DateTime, '%d-%m-%Y %T') as bank_Slip_DateTime\
            FROM orders natural join address\
            WHERE user_Id = " + req.user.user_Id;

        database.RunQuery(selectOrder,Sequelize.QueryTypes.SELECT, function (orders) {
            let sqlStr = '\
            SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
            database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
                var cate=JSON.stringify(getNestedChildren(category,0));
                contextDict.title= 'ติดตามคำสั่งซื้อ',
                contextDict.customer= req.user, //-ส่งค่า req.user ไปที่ตัวแปร customer 
                contextDict.categories=cate,
                contextDict.orders= orders,
                res.render('profile/order', contextDict);
            });
        });
    })

router.route('/order/detail/:order_id')
    .get(isLoggedIn, async function (req, res) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlStr = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
        database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
            var cate=JSON.stringify(getNestedChildren(category,0));
            const selectQuery = "\
            SELECT order_Id,address.fullname,address.phone,address,provinces_name,amphures_name,tambons_name,zip_code,bank_Slip,bank_Slip_DateTime,tranship,net_Price,people_Community_Id,comment\
            ,DATE_FORMAT(created_At, '%d-%m-%Y %T') as created_At,DATE_FORMAT(update_At, '%d-%m-%Y %T') as update_At,order_Status,tracking\
            FROM order_lists natural join orders natural join product natural join address\
            natural join provinces natural join amphures natural join tambons\
            where order_Id = " + req.params.order_id + " and user_Id = " + req.user.user_Id + " group by people_Community_Id";
                database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (order) {
                    let selectShop = "\
                    SELECT community_Shop_Name,people_Community_Fullname,people_Community_Phone,bank_Number,bank_Name,QR_Code,community_name,people_Community_Phone\
                    FROM people_community natural join bank natural join community where people_Community_Id = " + order[0].people_Community_Id;
                        database.RunQuery(selectShop,Sequelize.QueryTypes.SELECT, function (bank) {
                            let sqlProduct = "\
                            SELECT *,JSON_EXTRACT(main_Product_Img,'$.filename0') As productImage FROM product natural join (Select order_Id,SUM(price*quantity) as TotalPrice from order_lists group by order_Id) as Tsum natural join order_lists\
                            natural join category natural join product_img natural join people_community natural join community where community_id = community_id and order_Id = " + req.params.order_id;
                            database.RunQuery(sqlProduct,Sequelize.QueryTypes.SELECT, function (product) {
                                contextDict.title= 'รายละเอียดคำสั่งซื้อ',
                                contextDict.customer= req.user,
                                contextDict.product= product,
                                contextDict.categories=cate,
                                contextDict.bank=bank,
                                contextDict.order= order
                                res.render('profile/orderDetail', contextDict);
                        });
                    });
                });
            });
        })

router.route('/order/detail/:order_id/confirm')
    .post(isLoggedIn,UploadQR_Code.single('slip'),function (req, res, next) {
        let form = req.body;
        let img=req.file;
        let upDateOrders = '\
        UPDATE orders\
        SET bank_Slip = \'' + img.filename + '\', \
            update_At = now()\, \
            bank_Slip_DateTime= DATE_FORMAT('+"'"+form.dateSlip+"'"+',"%Y-%m-%d %T"),\
            order_Status = \'' + 1 + '\' \
            WHERE order_Id = ' + req.params.order_id ;
        database.RunQuery(upDateOrders,Sequelize.QueryTypes.UPDATE, function (Row){
            res.redirect('/Account/order');
            // console.log(upDateOrders);
        });
    })

router.route('/order/detail/:order_id/cancel')
    .post(isLoggedIn, function (req,res){
        let upDateOrders = '\
            UPDATE orders\
            SET comment = \'' + 'ลูกค้ายกเลิกคำสั่งซื้อด้วยตนเอง' + '\', \
                update_At = now()\, \
                order_Status = \'' + 4 + '\' \
                WHERE order_Id = ' + req.params.order_id;
            database.RunQuery(upDateOrders,Sequelize.QueryTypes.UPDATE, function (Row){
                let selectOrder= "\
                    SELECT * FROM order_lists natural join product\
                    WHERE order_Id = " + req.params.order_id;
                    database.RunQuery(selectOrder,Sequelize.QueryTypes.SELECT, function (rows) {
                        for (let item in rows) {
                            let updateQuery='UPDATE product\
                                SET product_Quantity = (product_Quantity + ' + rows[item].quantity  +
                                ') WHERE product_Id = ' + rows[item].product_Id;
                            database.RunQuery(updateQuery,Sequelize.QueryTypes.UPDATE, function(result2){
                        });
                    }res.redirect('/Account/order/');
                });
            });
        })

module.exports = router;
