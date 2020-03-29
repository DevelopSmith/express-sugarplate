var mongoose = require('mongoose');
var User = mongoose.model('User');
var async = require('async');
var crypto = require('crypto');

import { authorify, sendResJSON } from '../utilities';

module.exports.getUser = (req, res) => {
	authorify(req, res, (req, res, userId, userEmail) => {
		//var data = (Object.keys(req.query).length) ? req.query : req.body;

		User
		.findById(userId)
		.select('-hash -salt -__v')
		.exec((err, user) => {
			if(err){
				sendResJSON(res, 400, err);
			}else{
				sendResJSON(res, 200, user);
			}
		});
	});
};

module.exports.getUserNames = (req, res) => {
	var data = (Object.keys(req.query).length) ? req.query : req.body;
	
	User
	.find({_id: {$in: data.users}})
	.select('firstname lastname')
	.exec( (err, users) => {
		if(err){
			sendResJSON(res, 400, err);
		}else{
			sendResJSON(res, 200, users);
		}
	});
}

module.exports.userBasicInfo = (req, res) => {
	var data = (Object.keys(req.query).length) ? req.query : req.body;

	User
	.findById(data.userId)
	.select('firstname lastname files')
	.exec((err, user) => {
		if(err){
			sendResJSON(res, 400, err);
		}

		if(user){
			var userFiles = user.files;
			var avatarObj = {};

			if(userFiles){
				userFiles.forEach(file => {
					if(file.what == 'avatar'){
						avatarObj = {
							name: file.name,
							source: file.source
						};
					}
				});
			}

			sendResJSON(res, 200, {
				firstname: user.firstname,
				lastname: user.lastname,
				avatar: avatarObj,
			});
		}
	});
};

module.exports.updateProfile = (req, res) => {
	authorify(req, res, (req, res, userId, userEmail, userRole) => {
		const query = (Object.keys(req.query).length) ? req.query : req.body;
		var id = null;

		async.waterfall([
			done => {
				if(query.other){
					utilities.userCan(userRole, 'get-driver', () => {
						id = query._id;
						done(null, id);
					});
				}else{
					id = userId;
					done(null, id);
				}
			},
			(id, done) => {
				if(id){
					User
					.findById(id)
					.select('-hash -salt -__v')
					.exec((err, user) => {
						if(err){
							sendResJSON(res, 400, err);
						}else{
							var fields = ['username', 'firstname', 'lastname', 'email', 'phone', 'fax', 'address1', 'address2', 'city', 'state', 'country', 'zip', 'about', 'company_name', 'driver_license', 'license_number', 'driver_license_expiration', 'account_type', 'bg_check', 'approvedToWork'];
							fields.forEach(field => {
								user[field] = query[field];
							});

							if(user.account_type == 'vendor'){
								user.insurance_coverage = query.insurance_coverage;
								user.liability_amount = query.liability_amount || 0;
								user.vendor_type = query.vendor_type;

								if(user.vendor_type == 'individual'){
									var company_fields = ['ssn'];
									
									company_fields.forEach(field => {
										user[field] = query[field];
									});
								}else if(user.vendor_type == 'company'){
									var company_fields = ['company_position', 'company_tax_id', 'company_type', 'company_employees', 'company_email', 'company_website'];
									
									company_fields.forEach(field => {
										user[field] = query[field];
									});
								}
							}

							user.accountStatus = query.accountStatus;

							//> TEMPORARY
							if(!user.givenID){
								user.givenID = utilities.makeUniqueID(10);
							}

							if(query.password){
								user.setPassword(query.password);
							}

							if(query.trucks){
								if(query.trucks.length){
									var myTrucks = query.trucks;
									var newTrucksArr = [];

									myTrucks.forEach((truck, index) => {
										//
										newTrucksArr.push({
											type: truck.type,
											make: truck.make,
											model: truck.model,
											year: truck.year,
											plate_number: truck.plate_number,

											max_payload: truck.max_payload,
											max_payload_unit: truck.max_payload_unit,
											max_capacity: truck.max_capacity,
											max_capacity_unit: truck.max_capacity_unit,

											registration_file: truck.registration_file,
											insurance_file: truck.insurance_file,

											registration_exp: truck.registration_exp,
											policy_number: truck.policy_number,
											insurance_exp: truck.insurance_exp
										});
									});

									user.trucks = newTrucksArr;
								}
							}

							user.save((err, user) => {
								if(err){
									sendResJSON(res, 400, err);
								}else{
									sendResJSON(res, 200, user);
								}
							});
						}
					});
				}

			}
		], error => {
			sendResJSON(res, 400, { error });
		});
	});
};

module.exports.changePassword = (req, res) => {
	authorify(req, res, (req, res, userId, userRole) => {
		const query = (Object.keys(req.query).length) ? req.query : req.body;

		User
		.findById(userId)
		.select('-files')
		.exec((err, user) => {
			if(err){
				sendResJSON(res, 400, 'Error happened');
			}

			if(user){
				if(!user.validPassword(query.current_pw)){
					sendResJSON(res, 400, 'The provided password does not match the current password!');
				}else{
					user.setPassword(query.new_pw);

					user.save((err, user) => {
						if(err){
							sendResJSON(res, 400, 'Could not save the new password');
						}else{
							sendResJSON(res, 200, 'done');
						}
					});
				}
			}
		});
	});
}

module.exports.forgotPassword = (req, res) => {
	const query = (Object.keys(req.query).length) ? req.query : req.body;

	async.waterfall([
		done => {
			crypto.randomBytes(20, (err, buf) => {
				var token = buf.toString('hex');
				done(err, token);
			});
		},
		(token, done) => {
			var email = query.email;
			email = email.toLowerCase();

			User.findOne({ email: email}, (err, user) => {
				console.log('Hola!!!');
				if (!user) {
					sendResJSON(res, 200, {error: 'User not found'});
					return true;
				}

				user.resetPasswordToken = token;
				user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

				user.save((err, user) => {
					done(null, token, user);
				});
			});
		},
		(token, user, done) => {
			utilities.sendEmail(user.email, 'Zuba Password Reset', 'forgotPassword', {
				host: req.headers.host,
				token: token
			}, response => {
				sendResJSON(res, 200, {response: response});
			});
		}
	], error => {
		if(err){
			sendResJSON(res, 200, { error });
		}else{
			res.redirect('/forgot');
		}
	});
};

module.exports.emailConfirmation = (req, res) => {
	User
	.findOne({emailConfirmationToken: req.params.token})
	.select('emailConfirmed')
	.exec((err, user) => {
		if(!user){
			console.log('Error', err);
			sendResJSON(res, 400, {error: 'can not find the provided token'});
		}else{
			user.emailConfirmed = true;

			user.save((err, user) => {
				if(err){
					console.log('Error', err);
					sendResJSON(res, 400, err);
				}else{
					sendResJSON(res, 200, 'activated');
				}
			});
		}
	});
};

module.exports.checkResetPassword = (req, res) => {
	User
		.findOne({
			resetPasswordToken: req.params.token,
			resetPasswordExpires: { $gt: Date.now() }
		})
		.exec((err, user) => {
			if(!user){
				sendResJSON(res, 200, {error: 'Password reset token is invalid or has expired.'});
			}else{
				sendResJSON(res, 200, 'password reset');
			}
		});
};

module.exports.doResetPassword = (req, res) => {
	const query = (Object.keys(req.query).length) ? req.query : req.body;

	async.waterfall([
		done => {
			User
			.findOne({
				resetPasswordToken: req.params.token,
				resetPasswordExpires: { $gt: Date.now() }
			})
			.exec((err, user) => {
				if(!user){
					sendResJSON(res, 200, {error: 'User not found'});
					return true;
				}

				user.setPassword(query.password);
				user.resetPasswordToken = undefined;
				user.resetPasswordExpires = undefined;

				user.save(err => {
					done(err, user);

				});
			});
		},
		(user, done) => {
			utilities.sendEmail(user.email, 'Your password has been changed', 'passwordResetConfirmation', {
				email: user.email,
				receiverName: user.username
			}, response => {
				sendResJSON(res, 200, {response: response});
			});
		}
	], err => {
		res.redirect('/');
	});
};