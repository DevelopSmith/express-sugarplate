export const makeUniqueID = (codeLength = 4, type = 'Aa0') => {
	let possiblitiesCategories = type.split('');
	let possibles =  '';
	let code = '';
	
	possiblitiesCategories.map(category => {
		switch(category){
			case 'A':
				possibles += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
				break;
			case 'a':
				possibles += 'abcdefghijklmnopqrstuvwxyz';
				break;
			case '0':
				possibles += '0123456789';
				break;
			case '$':
				possibles += '$%^&*()_+=-*@!';
				break;
			default:
				possibles += '';
				break;
		}
	});

	for(let i=0; i < codeLength; i++){
		code += possibles.charAt(Math.floor(Math.random() * possibles.length));
	}

	return code;
};

export const sortByKey = (array, key) => {
	return array.sort((a, b) => {
		const x = a[key];
		const y = b[key];

		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});
}

export const getRandomString = text => {
	return text + Math.floor((Math.random() * 100000) + 1);
}

export const getRandomInt = () => {
	return Math.floor((Math.random() * 100000) + 1);
}

export const getRandomAmount = () => {
	return ((Math.random() * 100) + 1).toFixed(2);
}

export const getDate = () => {
	return (new Date()).toISOString().substring(0, 10) ;
}