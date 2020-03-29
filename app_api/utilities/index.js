const mongoose = require('mongoose');
const User = mongoose.model('User');

const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const transporter = nodemailer.createTransport(smtpTransport({
	service: 'Godaddy',
	host: "smtpout.secureserver.net",
	secureConnection: true,
	auth: {
		user: 'admin@xyz.xyz',
		pass: 'xyz'
	},
	port: 465,
	// tls: { rejectUnauthorized: false }
}));

const senderEmail = 'admin@xyz.xyz';

const sendResJSON = (res, status, content) => {
	res.status(status);
	res.json(content);
};

const authorify = (req, res, callback) => {
	if(req.payload.email){
		User
		.findOne({ email : req.payload.email })
		.exec((err, user) => {
			if(!user){
				sendResJSON(res, 400, { message: 'user not found' });
				return;
			}else if(err){
				console.error(err);

				sendResJSON(res, 400, err);
				return;
			}
			
			callback(user._id, user.email, user.role);
		});
	}else{
		sendResJSON(res, 400, { message: 'user not found' });
		return;
	}
};

const sendEmail = (receiverEmail, subject, templateName, templateOptions, callback) => {
	const emailTemplates = {
		newUserRegistration: '<b>Hello,</b><br><br>We are happy that you registered with Sugarplate.<br><br>Are you ready to deliver with us? <br> Thank you<br> Sugarplate',
	}

	let emailHtml = emailTemplates[templateName];

	if(emailHtml){
		for(let key in templateOptions){
			if(templateOptions.hasOwnProperty(key)){
				if(emailHtml.search('{{'+ key +'}}') >= 0){
					emailHtml = emailHtml.replace(new RegExp('{{'+ key +'}}', 'g'), templateOptions[key]);
				};
			}
		}

		const mailOptions = {
			from: senderEmail,
			to: receiverEmail,
			subject: subject,
			html: emailHtml
		};

		transporter.sendMail(mailOptions, (err, info) => {
			if(err){
				console.log(err);
			}else{
				console.log('Email sent: ' + info.response);
				callback(info.response);
			}
		});
	}else{
		callback(`Email template "${templateName}" does NOT exist`);
	}
}

const contactUs = (req, res) => {
	const query = (Object.keys(req.query).length) ? req.query : req.body;
	const emailHtml = `<strong>Sender name</strong>: ${query.senderName}<br><strong>Sender email</strong>: ${query.senderEmail}<br>______________________________________________________________________________________<br><br>${query.senderMessage}`;

	const mailOptions = {
		from: 'admin@xyz.xyz',
		to: 'info@xyz.xyz',
		subject: `Message from ${query.senderName} [${query.senderEmail}]`,
		html: emailHtml
	};

	transporter.sendMail(mailOptions, (err, info) => {
		if(err){
			sendResJSON(res, 200, err)
		}else{
			console.log('Email sent:', info.response);
			sendResJSON(res, 200, info.response)
		}
	});	
}

export {
	authorify,
	sendResJSON,
	sendEmail,
	contactUs
};