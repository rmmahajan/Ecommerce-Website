var express = require('express');
var app=express();
var router = require('express').Router();
const Product = require('../../models/product-model');

var bodyParser = require('body-parser');
var path =require('path');
var ejs= require('ejs');
app.set('views', __dirname+'../views');
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.set('view engine' , 'ejs');
app.use(express.static('/views'));

router.get('/click/:id', (req,res)=>{
    //console.log(req.body);
    Product.findOne({_id : req.params.id}, function (err, prod) {
        if (err) throw err;
        if (prod) {
                prod.remove();
                res.redirect('/products/products/:page');
            }
    });
});

// router.post('/savedb/:id',urlencodedParser ,(req,res)=>{
//     Product.findOne({_id : req.params.id}, function (err, prod) {
//         if (err) throw err;
//         if (prod) {
//                 prod.productName= req.body.productName;
//                 prod.productDescription= req.body.productDescription;
//                 prod.productPrice= req.body.productPrice;
//                 prod.productQuantity= req.body.productQuantity;
//             }
//             prod.save((err,updatedProd)=>{
//                 if(err) throw err;
//                 console.log('Updated');
//             });
//             res.redirect('/products/products/:page')
//     });
// });

module.exports = router;