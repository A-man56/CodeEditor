const router = require('express').Router();
const {signup,login} = require('../controllers/authController');
const {signupValidation,loginValidation} = require('../middleware/authvalidation');

router.post('/signup',signupValidation,signup);
router.post('/login',loginValidation,login);


module.exports = router;
