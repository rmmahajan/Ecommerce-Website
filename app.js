var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
const User = require('./models/user-model');
const Cart = require('./models/cart-model');
var bcrypt = require('bcrypt');
var session = require('express-session');
const Product = require('./models/product-model');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


//middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: true}));


//routes used
var editProductRoutes = require('./routes/admin/editProduct-routes');
var deleteProductRoutes = require('./routes/admin/deleteProduct-routes');


//mongo connection
var dbo;
mongoose.connect('mongodb://localhost/ecommerce',function(err,dbb)
{
  console.log("Server Connected To Port 3000");
  if(err)
  throw err;
  dbo = dbb;
},{ useNewUrlParser: true },{ useUnifiedTopology: true });


//cookies setup
app.use(cookieParser());
app.use(session({
    saveUninitialized: false,
    resave: true,
    secret: "12345"
}));


//Home page
app.get('/', (req, res) => {
  res.render('home', { user: req.user });
});


//user registration
app.get('/register', (req, res) => {
  if(req.session.LoggedIn)
  {
    res.render('profile',{
      LoggedIn: req.session.LoggedIn,
      user: req.session.user
    });  
  }
  else
  {
    res.render('register',{
      LoggedIn: req.session.LoggedIn,
      user: req.session.user
    });
  }
});

const saltRounds=10;
app.post('/register', (req, res)=> {

  if(!req.body.username || !req.body.password) 
  {
      res.redirect('/register');
  }
  else 
  {
    bcrypt.genSalt(saltRounds,function(err,salt){
      bcrypt.hash(req.body.password,salt,function(err,hash){

              var name = {username : req.body.username};
              User.findOne(name)
              .then((nm)=>{
                if(nm)
                {
                res.render('userError');
                }
                else
                {
                  var user = new User();
                  user.username = req.body.username,
                  user.name = req.body.name,
                  user.gender = req.body.gender,
                  user.dob = req.body.dob,
                  user.password = hash,
                  user.role = 'user',
                  user.loginType = 'Local Strategy' 

                  user.save();          
                  console.log('user created :',req.body.name );
                  res.redirect('/auth/login');
                }
              });
      });
  });
}
});


//user login
app.get('/auth/login',function(req,res){
  if(req.session.LoggedIn)
  {
      res.render('profile',
      {
        LoggedIn: req.session.LoggedIn,
        user: req.session.user
      });
  }
  else
  {
      res.render('login',{
      err: 0,
      LoggedIn: req.session.LoggedIn
    });
  }
});


//Check for user login
app.post('/auth/local',function(req,res){
  var query = { username : req.body.username};

  dbo.collection("users").find(query).toArray(function(err,result){
    if(err){
      throw err;
    }
    if(result.length == 0)
    {
        res.render('login',{
        err: 1,
        LoggedIn: req.session.LoggedIn
      });
    }
    else
    {
      bcrypt.compare(req.body.password,result[0].password,function(err,matched){
        if(err)
        {
          throw err;
        }        
        if(matched)
        {
          console.log(req.body);
          req.session.LoggedIn = true;
          req.session.user = result[0];
          if(req.body.remember)
          {

          }
          else
          {
            req.session.cookie.maxage = 300000;
          }
          res.redirect('/');
        }
        else
        {
            res.render('login',{
            err : 1,
            LoggedIn : req.session.LoggedIn
          });
        }
      });
    }
  });
});


//logout user
app.get('/auth/logout', (req, res) => {  
  req.session.destroy();
  res.redirect('/'); 
});


//check if user is logged in or not
const authCheck = (req, res, next) => {
  if(!req.session.user)
  {
      res.redirect('/auth/login');
  } 
  else
  {
      next();
  }
};


//user profile
app.get('/profile', authCheck, (req, res) => {
  res.render('profile', { user: req.session.user });
});


//add products by admin
app.get('/admin/uploadProduct',function(req,res){
  res.render('addProd');
});

app.post('/addToCart', function(req ,res){
  
  var user = req.session.user.username;

if(req.body.quantity!='undefined'&&req.body.quantity!=""&&req.body.quantity!=0&&req.body.quantity!='0')
{
Cart.find({user_name:req.session.user.username},(err, prod)=>{
  var flag=0;
  for(var i in prod)
  {
    if(prod[i].product_id==req.body.product_id)
    {
      prod[i].quantity=  +prod[i].quantity + +req.body.quantity;
      prod[i].save();
      flag=1;
      break;
    }
  }
  if(flag==0)
  {  
 var cart = new  Cart();
 cart.user_name= user;
 cart.productName= req.body.productName;
 cart.product_id= req.body.product_id;
 cart.price= req.body.price;
 cart.quantity= req.body.quantity;
 cart.save();
  }
});
  res.end('Product Added :'+req.body.productName+', Quantity : '+req.body.quantity );
}
else
res.end('Invalid Quantity');
});


app.post('/admin/uploadProd',function(req,res)
{
  if(!req.body.productName)
    {   

    }
    else
    {
        var name = {productName : req.body.productName};
          Product.findOne(name)
          .then((p)=>{
            if(p)
            {
              res.redirect('/admin/uploadProduct');
            }
            else
            {
              var product = new Product();
              product.productName= req.body.productName;
              product.productDescription= req.body.productDescription;
              product.productPrice= req.body.productPrice;
              product.productQuantity= req.body.productQuantity;
              product.save();
              res.redirect('/profile')
            }
          });
    }
});


//Display all products with pagination
app.get('/products/products/:page', function(req, res, next) {
  if(!req.session.user)
  {
    res.render('login',{
      err: 1,
      LoggedIn: req.session.LoggedIn
    });
  }

  var perPage = 9
  var page = req.params.page || 1
  Product
        .find({})
        .skip((perPage * page) - perPage)
        .limit(perPage)
        .exec(function(err, products) {
            Product.count().exec(function(err, count) {
                if (err) return next(err)
            // console.log(req.session.user+"^^");
                res.render('products', {
                    products: products,
                    current: page,
                    pages: Math.ceil(count / perPage),
                    user: req.session.user
                })
            })
      })
})

app.get('/products/productlist/data', (req, res)=>{


  if(!req.session.user)
  {
    res.render('login',{
      err: 1,
      LoggedIn: req.session.LoggedIn
    });
  }

  var perPage = 9
  var page = req.query.page || 1

  

  Product
      .find({})
      .skip((perPage * page) - perPage)
      .limit(perPage)
      .exec(function(err, products) {
          Product.countDocuments().exec(function(err, count) {
              if (err) return next(err)
              //console.log(products);
              else
              {
                console.log(req.session.user+"##");
                  res.send({products: products, pageNo: page, pages: Math.ceil(count / perPage),user: req.session.user});
              }
          })
      })
})


var prodQuan;


app.post('/products/name/:id', (req, res)=>
  {


    if(!req.session.user)
  {
    res.render('login',{
      err: 1,
      LoggedIn: req.session.LoggedIn
    });
  }

       Product.findOne({_id: req.params.id}, function (err, product) {

       prodQuan=req.body.prodQuan;
        console.log(prodQuan);
        
          if (err) throw (err);
          if (product) {
              res.render('showProduct', {product:product, user: req.session.user});
          } 
      });
  });




app.get('/cart/showCart',(req,res)=>{
  console.log(req.body);
  if(!req.session.user)
  {
    res.render('login',{
      err: 1,
      LoggedIn: req.session.LoggedIn
    });
  }
  User.findOne({_id : req.session.user._id}, (err, user)=>{
      if(err) throw err;
      if(user) {

          Cart.find({user_name:req.session.user.username},(err, prod)=>{
           var sum=0;
           var sum2=0;
            var results=[];
          Product.find({},(err, pr)=>
          {
            for(var i=0;i<pr.length;i++)
            {
              for(var j=0;j<prod.length;j++)
              {
                if(pr[i]._id==prod[j].product_id)
                {
                  if(pr[i].productQuantity>=prod[j].quantity){
                      //pr[i].productQuantity=pr[i].productQuantity-prod[j].quantity;
                        pr[i].save(err, function(re){});
                        results.push({prod:prod[j], stock:"<p>Status :<span style='color:green'> Available</p>", stockA:'A'});
                     sum2=sum2+prod[j].price*prod[j].quantity;
                      }
                      else
                    results.push({prod:prod[j], stock:"<p>Status :<span style='color:red'> Not In Stock</p>", stockA:'B'});
                sum=sum+prod[j].quantity*pr[i].productPrice;
                  }
              }
          }
         res.render('cart',{prod:results, total:sum, Atotal:sum2});
          });  
      });
    }
  
});

});
app.post('/cart/addQuan', (req, res)=>{
  Product.findOne({_id:req.body.prod_id}, function(err, res1){
    console.log('GOT + '+res1.productQuantity+' '+req.body.quan+'=='+req.body.prod_id);
    if( +res1.productQuantity  <   +req.body.quan+1)
    res.end('OS');
    else
    res.end('ended');

    Cart.findOne({user_name:req.session.user.username, product_id:req.body.prod_id}, function(err, result){
      result.quantity= (+result.quantity+1);
      result.save();
  });

  });
  
});
app.post('/cart/remQuan', (req, res)=>{
  Product.findOne({_id:req.body.prod_id}, function(err, res1){
    
    if( (+res1.productQuantity)  >=   (+req.body.quan-1)){
      console.log('GOT + '+res1.productQuantity+' '+req.body.quan);   
      res.end('IS');
    }  
        Cart.findOne({user_name:req.session.user.username, product_id:req.body.prod_id}, function(err, result){
        result.quantity= (+result.quantity-1);
        if(result.quantity=='0'||result.quantity==0){
        Cart.remove({user_name:req.session.user.username, product_id:req.body.prod_id}, function(err, inf){});
        res.end('RELOAD');}
else
        res.end('GOT'); 

        result.save();
    });
  
});
 
});
app.post('/cart/checkout', (req,res)=>{
console.log(req.body);
    User.findOne({_id : req.session.user._id}, (err, user)=>{
        if(err) throw err;
        if(user) {

            Cart.find({user_name:req.session.user.username},(err, prod)=>{
              if (err) throw err;

              console.log(prod);
            var results=[];
            var flag=0;
            var pppp="";
            var pppp1="";
            Product.find({},(err, pr)=>
            {
              for(var i=0;i<pr.length;i++)
              {
                for(var j=0;j<prod.length;j++)
                {
                  if(pr[i]._id==prod[j].product_id)
                  {
                    if(pr[i].productQuantity>=prod[j].quantity){
                        pr[i].productQuantity=pr[i].productQuantity-prod[j].quantity;
                        Cart.remove({ user_name:req.session.user.username, product_id:pr[i]._id}, function(err, result){});
                          pr[i].save(err, function(re){});
                          results.push({prod:prod[j], stock:'Available'});
                          pppp1=pppp1+prod[j].productName;
                       }
                        else{
                      results.push({prod:prod[j], stock:'Not In Stock'});
                    flag=prod[j].productName;
                    pppp=pppp+prod[j].productName+", ";
                    }
                  }
                }
            }
            if(flag=='0'||flag==0) {
            res.send('Order Placed');
            }else
            res.send(pppp+' :  Out Of Stock \n Order placed for : '+pppp1); 
           
                        });  
        });
      }
    
});

});



//edit product

app.use('/edit',(req,res,next)=>{
  if(req.user){
  if(req.user.role=='user') {
    res.redirect('/auth/logout');
  }}
  next();
}, editProductRoutes);

//delete product

app.use('/delete',(req,res,next)=>{
  if(req.user){
  if(req.user.role=='user') {
    res.redirect('/auth/logout');
  }}
  next();
}, deleteProductRoutes);



module.exports = app;