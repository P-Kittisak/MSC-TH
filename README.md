# MSC-TH -> ระบบตลาดสื่อกลางเพื่อจำหน่ายสินค้าชุมชน(Marketplace system for selling community product)
Step 1	import your database

Step 2	go to directory--> called cmd this project 

Step 3	when your open cmd or termial use " npm install "

Step 4	when your open cmd or termial use " npm start " to open server

Step 5	If Error go to floder config and open files Config.js or App.js

        change in config only
                production: {
                username: 'your user',
                password: 'your password',
                database: 'Platform',
                host: 'your localhost',
                dialect: 'mysql',
                port:'3306',
                },
        
        In App.js on line 106 
        this.app.listen(80); change 80 to 3000 if apache use prot 80
        and save files
        called cmd use " npm start " again

User Admin
username : Admin
password : Admin123456
