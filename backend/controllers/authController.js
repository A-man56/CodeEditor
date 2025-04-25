const bcrypt = require('bcrypt'); 
const UserModel = require('../model/UserModel');
const jwt =  require('jsonwebtoken'); 

const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new UserModel({ name, email, password: hashedPassword });

        await user.save();

        res.status(201).json({ message: 'Signup successful',success:true });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error', success: false });
    }
};
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const errmsg="auth failed email or password is incorrect";
        const existingUser = await UserModel.findOne({ email });
        if (!existingUser) {
            return res.status(403).json({ message: errmsg ,success:false});
        }
        const ispassvalid = await bcrypt.compare(password, existingUser.password);
        if(!ispassvalid) {
            return res.status(403).json({ message: errmsg ,success:false});
        }
        const token = jwt.sign(
            { email: existingUser.email, ID: existingUser._id },    
             process.env.JWT_SECRET, { expiresIn: '24h' }
            ); 
        res.status(200).json({ message: 'Login successful', success:true, token, email, name:existingUser.name });


    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error', success: false });
    }
};

module.exports = { signup,login };
