import greeter from './greeter';

describe('greeter', function() {
    it('should create a greeting', function() {
        expect(greeter('Dave')).to.equal('Hello, Dave. You\'re looking well today.');
    });

    it('should create a greeting for a different name', function() {
        expect(greeter('John')).to.equal('Hello, John. You\'re looking well today.');
    });
});
