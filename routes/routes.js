var express = require('express');
var router = express.Router();
const { Sequelize } = require('sequelize');
//import database module
var database = require('../config/database');
const CartData = require('../routes/modules');

// Route Home Page
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
router.all('/',async function (req, res, next) {
    try{
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlStr = 'SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
        database.RunQuery(sqlStr,Sequelize.QueryTypes.SELECT, function (category) {
            const sqlProduct = "\
                SELECT community_Shop_Name,community_name,product_Id, product_Name, product_Detail, product_Quantity, product_Price, product_Status,category_Id, category_Name\
                ,JSON_EXTRACT(main_Product_Img,'$.filename0') As productImage\
                FROM people_community natural join community natural join product natural join product_img natural join category\
                WHERE product_Status = 0 ORDER BY createUp DESC";
                var cate=JSON.stringify(getNestedChildren(category,0));
                database.RunQuery(sqlProduct,Sequelize.QueryTypes.SELECT, function (product) {
                contextDict.title= 'หน้าแรก',
                contextDict.customer= req.user,
                contextDict.categories= cate,
                contextDict.product= product,
                res.render('index', contextDict);
            });
        });
    } catch (err) {
        console.log(err);
    }
});

router.route('/cat/:category_Name/:product_Id/:product_Name')
    .all(async function (req, res, next) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let sqlCategory = '\
        SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC';
        database.RunQuery(sqlCategory,Sequelize.QueryTypes.SELECT, function (category) {
            let sqlProduct = "\
            SELECT community_name,people_Community_Phone,product_Id,product_Weight,community_Shop_Name, product_Name, product_Detail, product_Quantity, product_Price, product_Status,category_Id, category_Name\
            ,JSON_EXTRACT(main_Product_Img,'$.filename0') As productImage0, JSON_EXTRACT(main_Product_Img,'$.filename1') As productImage1, JSON_EXTRACT(main_Product_Img,'$.filename2') As productImage2\
            ,JSON_EXTRACT(main_Product_Img,'$.filename3') As productImage3, JSON_EXTRACT(main_Product_Img,'$.filename4') As productImage4, JSON_EXTRACT(main_Product_Img,'$.filename5') As productImage5, JSON_EXTRACT(main_Product_Img,'$.filename6') As productImage6\
            FROM community natural join people_community natural join product natural join product_img natural join category\
            WHERE product_Status = 0 AND product_Id = \'" + req.params.product_Id + ' AND community_id = community_id' +'\'';
            var cate=JSON.stringify(getNestedChildren(category,0));
            database.RunQuery(sqlProduct,Sequelize.QueryTypes.SELECT, function (product) {
                contextDict.title= product[0].product_Name,
                contextDict.product= product,
                contextDict.categories=cate,
                contextDict.customer= req.user,
                res.render('productDetail', contextDict);
            });
        });
    });

router.route('/search')
    .get(async function (req, res, next) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let selectCate="SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC;"
        database.RunQuery(selectCate,Sequelize.QueryTypes.SELECT,(category)=>{
            var cate=JSON.stringify(getNestedChildren(category,0));
            let product_Name=req.query.product_Name;
            var category=req.query.category;
            let communityName=req.query.community_name;
            let sort=req.query.Sort;
            
            if(sort==="ASC"){
                let SelectProductASC = "\
                SELECT *,JSON_EXTRACT(main_Product_Img,'$.filename0')As productImage\
                FROM community natural join people_community natural join product natural join product_img natural join category\
                where product_Status like 0 and product_Name like '%"+product_Name+"%' and category_Id like '%"+category+"%' and community_name like '%"+communityName+"%' order by product_Price "+sort;
                database.RunQuery(SelectProductASC,Sequelize.QueryTypes.SELECT,(showdata)=>{
                    contextDict.title= 'ค้นหา',
                    contextDict.customer= req.user,
                    contextDict.product= showdata,
                    contextDict.categories=cate,
                    contextDict.community_name= communityName,
                    contextDict.product_Name=product_Name,
                    contextDict.category=category,
                    contextDict.Sort=sort
                    res.render('search',contextDict)
                });
            }
                if(sort==="DESC"){
                let SelectProductDESC = "\
                SELECT *,JSON_EXTRACT(main_Product_Img,'$.filename0')As productImage\
                FROM community natural join people_community natural join product natural join product_img natural join category\
                where product_Status like 0 and product_Name like '%"+product_Name+"%' and category_Id like '%"+category+"%' and community_name like '%"+communityName+"%' order by product_Price "+sort;
                database.RunQuery(SelectProductDESC,Sequelize.QueryTypes.SELECT,(showdata)=>{
                    contextDict.title= 'ค้นหา',
                    contextDict.customer= req.user,
                    contextDict.product= showdata,
                    contextDict.categories=cate,
                    contextDict.community_name= communityName,
                    contextDict.product_Name=product_Name,
                    contextDict.category=category,
                    contextDict.Sort=sort
                    res.render('search',contextDict)
                });
            }
            if(sort ===""){
                let SelectProduct = "\
                    SELECT *,JSON_EXTRACT(main_Product_Img,'$.filename0')As productImage\
                    FROM community natural join people_community natural join product natural join product_img natural join category\
                    where product_Status like 0 and product_Name like '%"+product_Name+"%' and category_Id like '%"+category+"%' and community_name like '%"+communityName+"%'";
                database.RunQuery(SelectProduct,Sequelize.QueryTypes.SELECT,(showdata)=>{
                    contextDict.title= 'ค้นหา',
                    contextDict.customer= req.user,
                    contextDict.product= showdata,
                    contextDict.categories=cate,
                    contextDict.community_name= communityName,
                    contextDict.product_Name=product_Name,
                    contextDict.category=category,
                    contextDict.Sort=sort
                    res.render('search',contextDict)
                });
            }
        });
    });


router.route('/search/:category_Id/:category_Name')
    .get(async function (req, res, next) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let selectCate="SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC;"
        database.RunQuery(selectCate,Sequelize.QueryTypes.SELECT,(category)=>{
            var cate=JSON.stringify(getNestedChildren(category,0));
            var category=req.params.category_Id;
            if(category !="" ){
                let SelectProduct = "\
                    SELECT *,JSON_EXTRACT(main_Product_Img,'$.filename0')As productImage\
                    FROM community natural join people_community natural join product natural join product_img natural join category\
                    where product_Status like 0 and category_Id like '%"+category+"%'";
                database.RunQuery(SelectProduct,Sequelize.QueryTypes.SELECT,(showdata)=>{
                    contextDict.title= 'ค้นหา',
                    contextDict.customer= req.user,
                    contextDict.product= showdata,
                    contextDict.categories=cate,
                    contextDict.category=category
                    res.render('search',contextDict)
                });
            }
        });
    });

router.route('/addCommunity')
    .get(async function (req, res, next) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let selectCate="SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC;"
        database.RunQuery(selectCate,Sequelize.QueryTypes.SELECT,(category)=>{
            let selectQuery = '\
                SELECT *\
                FROM provinces';
            var cate=JSON.stringify(getNestedChildren(category,0));
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (provinces) {
                contextDict.title= 'คำขอเพิ่มชุมชนในระบบของเรา',
                contextDict.customer= req.user,
                contextDict.categories=cate,
                contextDict.category=category,
                contextDict.provinces= provinces
                res.render('addCommunity',contextDict)
            });
        });
    })

    .post(function (req, res, next) {
        let form = req.body;
        let insertCommunity = 'INSERT INTO add_community\
            VALUES(null, ' + '\'' +
                form.communityCode + '\'' + ', \'' +
                form.communityShopName + '\'' + ', \'' +
                form.Tambon + '\'' + ', \'' +
                form.Zipcode + '\'' + ', \'' +
                0 + '\')';
            database.RunQuery(insertCommunity,Sequelize.QueryTypes.INSERT, function (result){
                res.redirect('/addCommunityStatus');
        });
    });

router.route('/addCommunity/:provinces_id')
    .get(function (req, res, next) {
        let selectQuery = '\
            SELECT *\
            FROM amphures where province_id='+req.params.provinces_id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (amphures) {
            res.send(amphures);
        });
    });


router.route('/addCommunity/:provinces_id/:amphure_id')
    .get(function (req, res, next) {
        let selectQuery = '\
            SELECT *\
            FROM  tambons Where amphure_id='+req.params.amphure_id;
        database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (amphures) {
            res.send(amphures);
        });
    });

router.route('/addCommunityStatus')
    .get(async function (req, res, next) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let selectcate="SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC;"
        database.RunQuery(selectcate,Sequelize.QueryTypes.SELECT,(category)=>{
            const selectQuery = '\
                SELECT *\
                FROM add_community';
            var cate=JSON.stringify(getNestedChildren(category,0));
            database.RunQuery(selectQuery,Sequelize.QueryTypes.SELECT, function (requestAddCommunity) {
                contextDict.title= 'คำขอเพิ่มชุมชนในระบบของเรา',
                contextDict.customer= req.user,
                contextDict.categories=cate,
                contextDict.category=category,
                contextDict.requestAddCommunity= requestAddCommunity
                res.render('addCommunityStatus',contextDict)
            });
        });
    })

router.route('/about')
    .get(async function (req, res, next) {
        const homePageData = new CartData(req);
        const contextDict = await homePageData.getData();
        let selectcate="SELECT * FROM category WHERE ref_Category_Id = ref_Category_Id ORDER BY category_Name ASC;"
        database.RunQuery(selectcate,Sequelize.QueryTypes.SELECT,(category)=>{
            var cate=JSON.stringify(getNestedChildren(category,0));
                contextDict.title= 'เกี่ยวกับเรา',
                contextDict.customer= req.user,
                contextDict.categories=cate,
                contextDict.category=category,
            res.render('about',contextDict)
        });
    });
    
module.exports = router;