const _ = require('lodash'),
	chai = require('chai')
	stdDev = require('../index');

const expect = chai.expect;

describe('index-test.js', () => {
	context('Working out Sample Standard deviation', () => {
		it('should calculate the correct number', () => expect(stdDev.sample([5, 5, 4, 2, 5])).to.equal(1.3));

		it('should round up correctly', () => expect(stdDev.sample([5, 5, 4, 5, 5, 5])).to.equal(0.41));

		it('should not return NaN', () => expect(_.isNaN(stdDev.sample([undefined, undefined]))).to.equal(false));
	});

	context('Working out Population Standard deviation', () => {
		it('should calculate the correct number', () => expect(stdDev.population([5, 5, 4, 2, 5])).to.equal(1.17));

		it('should round up correctly', () => expect(stdDev.population([5, 5, 4, 5, 5, 5])).to.equal(0.37));

		it('should not return NaN', () => expect(_.isNaN(stdDev.population([undefined, undefined]))).to.equal(false));
	});

	context('Length calculations', () => {
		it('should get the correct length for "Sample" type', () => expect(stdDev.length([5, 5, 4, 5], 'sample')).to.equal(3));

		it('should get the correct length for "Population" type', () => expect(stdDev.length([5, 5, 4, 5], 'population')).to.equal(4));
	});

	context('formatting', () => {
		it('should format the numbers to two decimal places', () => expect(stdDev.format(1.5125621)).to.equal(1.51));

		it('should round the numbers up correctly', () => expect(stdDev.format(1.5184421)).to.equal(1.52));

		it('should ', () => expect(stdDev.format(1.50)).to.equal(1.50));
	});
});
