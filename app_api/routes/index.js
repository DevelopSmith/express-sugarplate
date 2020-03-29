import express from 'express';
import passport from 'passport';
import jwt from 'express-jwt';

const router = express.Router();
const auth = jwt({
	secret: process.env.JWT_SECRET,
	userProperty: 'payload'
});

// import the API methods
import * as ctrlUser	from '../controllers/user';

// User
router.get('/user/get-user', auth, ctrlUser.getUser);
router.get('/user/get-usernames', ctrlUser.getUserNames);
router.post('/user/update-profile', auth, ctrlUser.updateProfile);
router.get('/user/basic-info', ctrlUser.userBasicInfo);

// User password and email confirmation
router.post('/user/change-password', auth, ctrlUser.changePassword);
router.post('/user/email-confirmation/:token', ctrlUser.emailConfirmation);
router.post('/user/forgot-password', ctrlUser.forgotPassword);
router.get('/user/reset/:token', ctrlUser.checkResetPassword);
router.post('/user/reset/:token', ctrlUser.doResetPassword);

// authentication
router.post('/register', passport.authenticate('local-register', {
	//successRedirect : '/',
	failureRedirect : '/',
	failureFlash : true // allow flash messages
}), (req, res) => {
	req.session.token = req.user.token;
	res.status(200);
	res.json(req.authInfo);
});

router.post('/login', passport.authenticate('local-login', {
	//successRedirect : '/',
	//failureRedirect : '/',
	failureFlash : true // allow flash messages
}), (req, res) => {
	//res.redirect('/');
	req.session.token = req.user.token;
	res.status(200);
	res.json(req.authInfo);
});

module.exports = router;