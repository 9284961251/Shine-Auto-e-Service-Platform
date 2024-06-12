const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Form = require('../models/form.js');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const User = require("../models/user.js");
const flash = require("connect-flash");
const bcrypt = require('bcrypt');
const saltRounds = 10;
const crypto = require('crypto');
// const jsPDF = require('jspdf');




const app = express();
const PORT = 8080;



// Set EJS as the default view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Generate a random secret key
const secretKey = crypto.randomBytes(32).toString('hex');
console.log("Secret Key:", secretKey);

// Middleware setup
const sessionOptions = {
  secret: secretKey, // Use the generated secret key here
  resave: false,
  saveUninitialized: true,
};

app.use(session(sessionOptions));
app.use(flash());

app.use(bodyParser.json()); 

app.use(bodyParser.urlencoded({ extended: true }));

app.use(methodOverride('_method'));


// Serve static files from the 'public' directory
app.use(express.static('public', { setHeaders: function (res, path) {
  if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
  }
}}));``


// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/vehicleWash')
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));



// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  // Check if userName is stored in the session (implies user is logged in)
  const isLoggedIn = req.session && req.session.userName;

  // If user is logged in, proceed to the next middleware or route handler
  if (isLoggedIn) {
      return next();
  }

  // If user is not logged in, redirect to login page
  res.redirect('/login');
}


// Root URL route should render the signup page if not logged in
app.use('/', function(req, res, next) {
  // Check if the request is for the root path and user is not logged in
  if (req.path === '/' && !req.session.userName) {
      // Redirect to the signup page if user is not logged in
      return res.redirect('/signup');
  }
  // If not the root path or user is logged in, proceed to the next middleware or route handler
  next();
});
 
// Serve index.html file
app.get("/home", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
 
 app.get("/signup", (req, res) => {
  res.render('signup', { messages: req.flash() });
});
app.post('/signup', async (req, res) => {
  const { userName, password } = req.body;

  try {
    // Check the total number of users
    const totalUsersCount = await User.countDocuments();
    if (totalUsersCount >= 3) {
      req.flash('error', 'The maximum number of users has been reached. Signups are currently closed.');
      return res.redirect('/signup');
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ userName });
    if (existingUser) {
      req.flash('error', 'User already exists');
      return res.redirect('/signup');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create a new user
    const user = new User({
      userName,
      password: hashedPassword
    });

    // Save the user to the database
    await user.save();

    // Redirect to the login page after successful signup
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Server error' });
  }
});



// Login route
app.get("/login", (req, res) => {
  res.render('login', { messages: req.flash() });
});

// Login route
app.post('/login', async (req, res) => {
  const { userName, password } = req.body;
  
  try {
    const user = await User.findOne({ userName });
    if (!user) {
      // Add error flash message for user not found
      req.flash('error', 'User not found');
      return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Add error flash message for invalid password
      req.flash('error', 'Invalid password');
      return res.redirect('/login');
    }

    // Store the user's userName in the session
    req.session.userName = user.userName;

    // Redirect to the home page after successful login
    return res.redirect('/home');
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: 'Server error' });
  }
});


app.get("/cart", isAuthenticated, async (req, res) => {
  try {
    // Retrieve data from MongoDB or any necessary data retrieval
    const formData = await Form.find().sort({ submitDateTime: -1 }).limit(10);

    // Render cart.ejs and pass data to it
    res.render('cart', { formData: formData, messages: req.flash() });  } catch (error) {
    console.error("Error retrieving form data:", error);
    res.status(500).send("Internal Server Error");
  }
});


//route to handle form submission
app.post("/form", isAuthenticated, async (req, res) => {
  try {
    // Extract form data from the request body and convert to lowercase
    let {
      vehicleType,
      customerName,
      phoneNumber,
      vehicleDetails,
      numberPlate,
      serviceType,
      subService,
      amountToBePaid,
      paymentStatus,
      paymentType
    } = req.body;

    // Convert fields to lowercase
    vehicleType = Array.isArray(vehicleType) ? vehicleType.map(type => type.toLowerCase()) : [vehicleType.toLowerCase()];
    customerName = customerName.toLowerCase();
    vehicleDetails = vehicleDetails.toLowerCase();
    numberPlate = numberPlate.toLowerCase(); // Convert numberPlate to lowercase
    serviceType = Array.isArray(serviceType) ? serviceType.map(type => type.toLowerCase()) : [serviceType.toLowerCase()];
    subService = Array.isArray(subService) ? subService.map(service => service.toLowerCase()) : [subService.toLowerCase()];
    paymentStatus = Array.isArray(paymentStatus) ? paymentStatus.map(type => type.toLowerCase()) : [paymentStatus.toLowerCase()];
    paymentType = Array.isArray(paymentType) ? paymentType.map(type => type.toLowerCase()) : [paymentType.toLowerCase()];

    // Create a new instance of the Form model with the form data
    const formData = new Form({
      vehicleType,
      customerName,
      phoneNumber,
      vehicleDetails,
      numberPlate,
      serviceType,
      subService,
      amountToBePaid,
      paymentStatus,
      paymentType
    });

    // Save the form data to the database
    await formData.save();

    res.send(`
      <script>
        alert('Customer added to cart successfully');
        window.location.href = '/home';
      </script> 
    `);
    
  
  } catch (error) {
    console.error("Error saving form data:", error);
    res.status(500).send("Internal Server Error");
  }
});


const getLocalDateString = (dateString) =>{

  const date = new Date(dateString); // Assuming endDate is a valid Date object

// Get date in month/day/year format
  const formattedEndDate = date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
  console.log(formattedEndDate);
  return formattedEndDate
}

// Route to render the viewSales.ejs file
// Update the route to accept query parameters for start and end dates
app.get("/viewSales", isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Handle invalid dates or missing parameters
    if (!startDate || !endDate || isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      const formData = await Form.find();
      return res.render('viewSales', { formData });
    }
    
    // Adjust the end date to be inclusive
    const adjustedEndDate = new Date(new Date(endDate).getTime() + 86400000); // Add one day (in milliseconds)
    
    const formData = await Form.find({
      submitDateTime: {
        $gte: new Date(startDate),
        $lte: adjustedEndDate
      }
    }).sort({ submitDateTime: -1 });

    res.render('viewSales', { formData });
  } catch (error) {
    console.error("Error retrieving form data:", error);
    res.status(500).send("Internal Server Error");
  }
});




app.get("/viewPending", isAuthenticated, async (req, res) => {
  try {
    // Retrieve data from the database or any necessary data retrieval
    const pendingData = await Form.find({ paymentStatus: "unpaid" }).sort({ submitDateTime: -1 });

    // Render viewSales.ejs and pass data to it
    // Render the pending list page with data and flash messages
    res.render('pendingList', { pendingData, messages: req.flash() });
  } catch (error) {
    console.error("Error retrieving sales data:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Edit route
app.get("/edit/:id", isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;

    console.log("Received ID:", id); // Log the ID parameter

    // Ensure the id parameter is a valid ObjectId
    if (!mongoose.isValidObjectId(id)) {
      req.flash('error', 'Invalid form ID');
      return res.status(404).redirect("/viewPending"); // Redirect with flash error message
    }

    // Query the database using the provided ID
    const formData = await Form.findById(id);

    // Check if formData is null
    if (!formData) {
      req.flash('error', 'Form not found');
      return res.status(404).redirect("/viewPending"); // Redirect with flash error message
    }

    // Render the edit form with formData and flash messages
    res.render('edit', { formData: formData, messages: req.flash() });
  } catch (error) {
    console.error("Error retrieving form data for editing:", error);
    req.flash('error', 'Internal Server Error');
    res.status(500).redirect("/viewPending"); // Redirect with flash error message
  }
});




// Update route
app.post("/update/:id", isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    const { paymentStatus, paymentType } = req.body;

    // Find the form data by ID and update paymentStatus and paymentType fields only
    const updatedForm = await Form.findByIdAndUpdate(id, {
      paymentStatus,
      paymentType
    }, { new: true }); // Ensure to set { new: true } to return the updated document

    // Check if the updatedForm is null (not found)
    if (!updatedForm) {
      req.flash('error', 'Form not found');
      return res.status(404).redirect("/viewPending"); // Redirect with flash error message
    }

    // Flash a success message
    req.flash('success', 'Form updated successfully');

    // Redirect back to the pending list with flash success message
    res.redirect("/viewPending");
  } catch (error) {
    console.error("Error updating form data:", error);
    req.flash('error', 'Internal Server Error');
    res.status(500).redirect("/viewPending"); // Redirect with flash error message
  }
});


// Route to render the Sales Overview page
app.get("/salesOverview", isAuthenticated, async (req, res) => {
  try {
    // Fetch sales data for the current day
      const salesData = await Form.find({ 
        submitDateTime: { 
          $gte: new Date(new Date().setHours(0,0,0)), 
          $lt: new Date(new Date().setHours(23,59,59)) 
        } 
      });
      
      // Calculate total cash sales
      const totalCash = salesData.reduce((total, sale) => {
        if (sale.paymentType.includes('cash')) {
          return total + sale.amountToBePaid;
        }
        return total;
      }, 0);

      // Calculate total online sales
      const totalOnline = salesData.reduce((total, sale) => {
        if (sale.paymentType.includes('online')) {
          return total + sale.amountToBePaid;
        }
        return total;
      }, 0);
      const totalCombined = totalCash + totalOnline;

    // Render the Sales Overview page with data
    res.render('salesOverview', { salesData, totalCash, totalOnline, totalCombined });
  } catch (error) {
    console.error("Error retrieving sales data:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Delete route
app.delete("/delete/:id", isAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    await Form.findByIdAndDelete(id);
    req.flash('success', 'Customer deleted successfully');
    res.redirect("/cart");
  } catch (error) {
    console.error("Error deleting form data:", error);
    req.flash('error', 'Failed to delete customer');
    res.status(500).send("Internal Server Error");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  // Destroy the current session
  req.session.destroy(err => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Internal Server Error");
    }
    // Redirect to the login page after session is destroyed
    res.redirect("/login");
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

