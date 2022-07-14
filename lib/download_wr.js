const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const stDev = require('node-stdev');
const getLeagueOfGraphs = require('./get_html');
const { comp_class_scores, attribute_order } = require('./consts');
const TSV = require('tsv');
const PSV = new TSV.Parser('\t');

async function init() {

    const champ_scores = PSV.parse(fs.readFileSync('data/champ_scores.tsv', 'utf8')).filter((x) => x['Champion'].length != 0);
    var data = {};

    return Promise.all(champ_scores.map(async (champion) => {
        const championName = champion['Champion'];
        const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
        const tag = championTag == 'wukong' ? 'monkeyking' : championTag;

        data[championName] = JSON.parse(JSON.stringify(champion));

        const html = await getLeagueOfGraphs(tag);
        const start = html.indexOf('data: [[10,') + 6;
        const end = html.indexOf(']],', start) + 2;
        const dom = new JSDOM(html);
        const avgWR = parseFloat(dom.window.document.getElementById('graphDD2').innerHTML.trim().slice(0, -1)) / 100.0;
        
        const winrates = JSON.parse(html.substring(start, end)).map((x) => [x[0], x[1] / 100]);
        data[championName]['WRAvg'] = avgWR;
        
        for (let val of winrates) {
            data[championName]['WR' + val[0] + 'min'] = val[1];
        };

        const average = arr => arr.reduce( ( p, c ) => p + c, 0 ) / arr.length;
        const stdev = stDev.sample(winrates.map((x) => x[1]));
        data[championName]['WREarly'] = average(winrates.map((x) => x[1]).slice(0, 4))-1*(avgWR-2*stdev);
        data[championName]['WRMid']   = average(winrates.map((x) => x[1]).slice(2, 6))-1*(avgWR-2*stdev);
        data[championName]['WRLate']  = average(winrates.map((x) => x[1]).slice(4   ))-1*(avgWR-2*stdev);
        data[championName]['WRTotal'] = data[championName]['WREarly'] + data[championName]['WRMid'] + data[championName]['WRLate'];
        data[championName]['WRScoreEarly'] = data[championName]['WREarly'] / data[championName]['WRTotal'] * 100;
        data[championName]['WRScoreMid']   = data[championName]['WRMid'] / data[championName]['WRTotal'] * 100;
        data[championName]['WRScoreLate']  = data[championName]['WRLate'] / data[championName]['WRTotal'] * 100;
        data[championName]['WRScoreTotal'] = data[championName]['WRScoreEarly'] + data[championName]['WRScoreMid'] + data[championName]['WRScoreLate'];
        for (let comp in comp_class_scores) {
            data[championName]['CompScore' + comp] = attribute_order.map((attr, index) => {
                return Math.pow(champion[attr] * comp_class_scores[comp][index], 2);
            }).reduce((score, total) => total + score, 0);
        }
        return data[championName];
    })).then((_) => {
        return data;
    });
}

(async () => {
    fs.writeFile('./data/champ_scores.tsv', PSV.stringify(Object.values(await init())), err => {
        if (err) {
            console.error(err);
        }
    });
})();