const router = require('express').Router();
var authService = require("../services/auth");

router.get('/', async (req, res) => {
    res.send("Login");
});

//Login service - POST method 
router.post('/login', async function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    let data;
    console.log('Login request')
    console.log('Login request body ', JSON.stringify(req.body))
    try {
        data = await authService.Login(username, password)
        console.log('Login response ', JSON.stringify(data))

    } catch (error) {
        console.log('Login error ', JSON.stringify(error))
        return error;
    }
    res.send(data);
});

router.post("/forgotpassword", async (req, res) => {
    var first = req.body.username;
    var last = req.body.Code;
    console.log('Forgot Password request')
    console.log('Forgot Password request body ', JSON.stringify(req.body))

    let data;
    try {
        data = await authService.forgotPassword(first, last)
        console.log('Forgot Password response ', JSON.stringify(data))

    } catch (error) {
        console.log('Forgot Password error ', JSON.stringify(error))
        return error;
    }
    res.send(data);

});

router.post("/register", async (req, res) => {

    var firstName = req.body.firstName;
    var lastName = req.body.lastName;
    var email = req.body.email;
    var password = req.body.password;
    var role = req.body.role;
    var managerName = req.body.managerName;
    var managerEmail = req.body.managerEmail;
    console.log('Register request')
    console.log('Register request body ', JSON.stringify(req.body))
    let data;
    try {
        data = await authService.Register(firstName, lastName, email, password, role, managerName, managerEmail);
        console.log('Register response ', JSON.stringify(data))

    } catch (error) {
        console.log('Register error ', JSON.stringify(error))
        return error;
    }
    res.send(data);


});

router.get('/getManagerData', async (req, res) => {
    let data;
    console.log('Get Manager Data request')

    try {
        data = await authService.getManagerData()
        console.log('Get Manager Data response ', JSON.stringify(data))

    } catch (error) {
        console.log('Get Manager Data error ', JSON.stringify(error))
        return error;
    }
    res.send(data);

});





module.exports = router;