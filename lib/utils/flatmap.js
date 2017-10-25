/**
 * Created by pablo on 5/7/17.
 */
const concat = (x,y) => x.concat(y);
const flatMap = (f,xs) => xs.map(f).reduce(concat, []);

module.exports =  function(f = function (x) { return x }) {
    return flatMap(f,this);
};
