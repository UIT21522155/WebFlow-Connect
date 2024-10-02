import pkg from '@woocommerce/woocommerce-rest-api';
const WooCommerceRestApi = pkg.default;
import {GoogleGenerativeAI} from '@google/generative-ai';
import request from 'request';
import graph from 'fbgraph';
import express from 'express';
import cors from 'cors';
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';
// import { parse } from 'json2csv';
// import { writeFileSync } from 'fs';

const app = express();

const port = 8000;

app.use(cors({
  origin: 'http://localhost:3000', // Replace with the URL of your React app
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const consumer_key = '';//fill your key
const consumer_secret = '';//fill your key
const authURL = 'https://webiste/wp-json/jwt-auth/v1/token';	// your website
const fb_Page_Id = "";//fill your facebook page_id
const fb_Page_Access_Token = ""; //fill your facebook page access token
graph.setAccessToken(fb_Page_Access_Token);
// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(""); //fill your api key

// The Gemini 1.5 models are versatile and work with most use cases
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});


const api = new WooCommerceRestApi({ 
	url: "https://webiste", 
	consumerKey: '', //fill your key from wordpress
  consumerSecret : '',//fill your key from wordpress
	version: "wc/v3"
  
  // Set the API version 
});


//CRUD PRODUCT///////////////////////

app.get('/products', (req, res) => {
  api.get("products")
  .then((response) => {
    
    // console.log(response.data);
    res.json(response.data);
  })
  .catch((error) => {
    console.log(error.response.data);
  });

});

app.post('/products',(req,res)=>{
  const productData = { 
    	name: req.body.name, 
    	regular_price: req.body.price,       
        manage_stock: true,
        stock_quantity: parseInt(req.body.stock_quantity) ,
        
    }; 
 
  api.post("products", productData)
  .then((response) => {
    res.json(response.data);
  })
  .catch((error) => {
   console.log(error.response.data);
  });


});



app.put('/products',(req,res)=>
{
  const data ={
    name: req.body.name, 
    regular_price: req.body.price, 
    manage_stock: true,
    stock_quantity: req.body.stock_quantity ,
      
  };
  api.put(`products/${req.body.id}`, data)
  .then((response) => {
    res.json(response.data);
    console.log("is this success?")
  })
  .catch((error) => {
    console.log(error.response.data);
  });

});

app.delete('/products', (req, res) => {
  api.delete(`products/${req.body.id}`, {
    force: true
  })
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      console.log(req.body);
      console.log(error.response.data);
    });
});

app.delete('/outstock_products', (req, res) => {
  api.get("products")
    .then((response) => {
      if (response.data) { // Check if response.data exists
        for (const product in response.data) {
          if (response.data[product]["stock_status"] === "outofstock") { // Use strict comparison
            const delId = response.data[product]["id"];
            api.delete(`products/${delId}`, {
              force: true
            })
              .then((response) => {
                res.json(response.data);
              })
              .catch((error) => {
                console.log(req.body);
                console.log(error.response.data);
              });
          }
        }
      } else {
        console.error("Error fetching products or no products found.");
        // Handle the case where no products are fetched or there's an error
      }
    })
    .catch((error) => {
      console.error(error.response.data);
    });
});


//CRUD COUPONSSSSS//////////////////
app.get('/coupons',(req,res)=>{
  api.get("coupons")
  .then((response) => {
    res.json(response.data);
  })
  .catch((error) => {
    console.log(error.response.data);
  });

});


app.put('/coupons', (req, res) => {
  const data = {
    code: req.body.code,
    amount: req.body.amount, // Assuming 'amount' contains the discount percentage
    minimum_amount: req.body.minimum_amount
  };
  api.put(`coupons/${req.body.id}`, data)
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      console.log(req.body);
      console.log(error.response.data);
    });
});


app.post('/coupons',(req,res)=>{
  const data = {
    code: req.body.code,
    discount_type: "percent",
    amount: req.body.amount,
    individual_use: true,
    exclude_sale_items: true,
    minimum_amount: req.body.minimun_amount 
  };
  
  api.post("coupons", data)
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      console.log(error.response.data);
    });

});


app.delete('/coupons',(req,res)=>{
  api.delete(`coupons/${req.body.id}`, {
    force: true
  })
    .then((response) => {
      res.json(response.data);
    })
    .catch((error) => {
      console.log(error.response.data);
    });
})






app.post('/post_product', async (req, res) => {
  try {
    const input = req.body.input;
    await run(input);
    res.status(200).json({ message: 'Post created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while posting the product' });
  }
});

app.post('/crawl', async (req, res) => {
  try {
    const { website, category } = req.body; // Get website and category from request body

    if (!website || !category) {
      return res.status(400).json({ message: 'Missing website or category' });
    }

    if (website.toLowerCase() === 'rabity') {
      const products = await crawlRab(category);
      return res.json({ data: products });
    } else if (website.toLowerCase() === 'warehouse') {
      console.log("warehouse")
      const products = await crawlWarehouse(category); // Replace with your actual crawling logic
      return res.json({ data: products });
    } else {
      return res.status(404).json({ message: 'Website not supported' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
















app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});








async function run(input) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `tôi là một nhà kinh doanh, tôi kinh doanh quần áo cho trẻ em, thương hiệu của tôi là {YourWebsite} với website là https://webiste tôi vừa ra mắt sản phẩm ${input} . Hãy viết bài viết facebook để giới thiệu về sản phẩm làm sao để thu hút người mua.`;
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  // console.log(text)

  const postTextOptions = {
    method: 'POST',
    uri: `https://graph.facebook.com/v20.0/${fb_Page_Id}/photos`,
    qs: {
      access_token: fb_Page_Access_Token,
      message: text,
      url : "https://webiste/wp-content/uploads/2024/05/nik9007_e97ea526807f44f1a6ead9213a8a769e_grande.jpg"
    },
    json: true
  };

  await request(postTextOptions);
  console.log(postTextOptions)
}

  async function crawlRab(category) {

    if(category =='Boy'){
    const genUrl = (page) => {
      return `https://rabity.vn/collections/thoi-trang-be-trai?q=filter=(((collectionid:product=1001303048)))&page=${page}&view=grid`;
  }   


  const results = [];
  for(let i = 1 ; i< 3 ;i ++)
  {
      const defaultUrl = genUrl(i);
      const response = await gotScraping(defaultUrl);
      const html = response.body;
      const $ = cheerio.load(html);
      const products = $('.item_product_main');
      for (const product of products) {
          const imageElement = $(product).find('img.img-fetured');
          const image = 'https:' + imageElement.attr('src');
 
          const titleElement = $(product).find('img');
          const  name =  titleElement.attr('alt');    
      
      const priceElement = $(product).find('span.price');
      const price = priceElement.contents()[0].nodeValue.trim();
    

    results.push({ image, name, price});
  }
  return results;     
  }

  }else {
    const genUrl = (page) => {
      return `https://rabity.vn/collections/thoi-trang-be-gai?q=filter=(((collectionid:product=1001303053)))&page=${page}&view=grid`;
  }


  const results = [];
  for(let i = 1 ; i<3 ;i ++)
  {
      const defaultUrl = genUrl(i);
      const response = await gotScraping(defaultUrl);
      const html = response.body;
      const $ = cheerio.load(html);
      const products = $('.item_product_main');
      for (const product of products) {
          const imageElement = $(product).find('img.img-fetured');
          const image = 'https:' + imageElement.attr('src');
          const titleElement = $(product).find('img');
          const  name =  titleElement.attr('alt');
        
          const priceElement = $(product).find('span.price');
          const price = priceElement.contents()[0].nodeValue.trim();
        
        results.push({ image, name, price});
      }
      

      return results;
  }



  }
 
  }

  async function crawlWarehouse(category)  {
    if(category == 'Audio')
{
    const genUrl = (page) => {
      return `https://warehouse-theme-metal.myshopify.com/collections/audio?page=${page}`;
  }
  const results = [];
  for(let i = 1 ; i< 2 ;i ++)
  {
      
          const storeUrl = genUrl(i);
          const response = await gotScraping(storeUrl);
          const html = response.body;
  
          // Parse HTML with Cheerio
          const $ = cheerio.load(html);
  
          // Find all products on the page
          const products = $('.product-item');
          for (const product of products) {
              const imageElement = $(product).find('img');
              const image = 'https:' + imageElement.attr('src');
          
              const titleElement = $(product).find('a.product-item__title');
              const name = titleElement.text().trim();
              const priceElement = $(product).find('span.price');
              const price = priceElement.contents()[2].nodeValue.trim();
      
              results.push({ image, name, price});
          }

      }
      return results;   
    }
      else if (category =='Hi Fi'){
        const genUrl = (page) => {
          return `https://warehouse-theme-metal.myshopify.com/collections/hi-fi?page=${page}`;
      }
      const results = [];
      for(let i = 1 ; i< 2 ;i ++)
      {
          
              const storeUrl = genUrl(i);
              const response = await gotScraping(storeUrl);
              const html = response.body;
      
              // Parse HTML with Cheerio
              const $ = cheerio.load(html);
      
              // Find all products on the page
              const products = $('.product-item');
              for (const product of products) {
                  const imageElement = $(product).find('img');
                  const image = 'https:' + imageElement.attr('src');
              
                  const titleElement = $(product).find('a.product-item__title');
                  const name = titleElement.text().trim();
                  const priceElement = $(product).find('span.price');
                  const price = priceElement.contents()[2].nodeValue.trim();
          
                  results.push({ image, name, price});
              }
      
          }
          return results;   
      }
  }
  




