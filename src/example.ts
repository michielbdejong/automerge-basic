import { Tub } from './tub.js';

const test = new Tub('test');
test.createDoc();
console.log('1');
test.doc.change(d => {
  d['foo'] = 'bar';
});
console.log('2');
console.log(test.doc['foo']);
console.log('3');
