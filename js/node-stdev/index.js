'use strict';

const _ = require('lodash');

class StdDev {
	length(numbers, type) {
		switch(type) {
			case 'sample':
				return numbers.length - 1;
			case 'population':
				return numbers.length;
		}
	}

	performCalculation(numbers, length) {
		return Math.sqrt(_(numbers).filter().reduce((sum, n) => {
			const difference = n - _.mean(numbers);
			return sum + difference * difference;
		}, 0) / length);
	}

	sample(numbers) {
		const result = this.performCalculation(numbers, this.length(numbers, 'sample'));
		return this.format(result);
	}

	population(numbers) {
		const result = this.performCalculation(numbers, this.length(numbers, 'population'));
		return this.format(result);
	}

	format(value) {
		return Number(parseFloat(value).toFixed(2));
	}
}

module.exports = new StdDev();
