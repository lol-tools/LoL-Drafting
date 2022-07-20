const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const stDev = require('node-stdev');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const { getChampionWROverTime } = require('./get_html');
const { comp_class_scores, attribute_order } = require('./consts');
const TSV = require('tsv');
const PSV = new TSV.Parser('\t');

async function getWRs() {

    const champ_scores = PSV.parse(fs.readFileSync('data/champ_scores.tsv', 'utf8')).filter((x) => x['Champion'].length != 0);
    var data = {};

    return Promise.all(champ_scores.map(async (champion) => {
        const championName = champion['Champion'];
        const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
        const tag = championTag == 'wukong' ? 'monkeyking' : championTag;

        try {
            data[championName] = JSON.parse(JSON.stringify(champion));

            const html = await getChampionWROverTime(tag);
            const start = html.search(/data: \[\[1.,/) + 6;
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
        } catch (e) {
            console.log(e, champion, await getChampionWROverTime(tag));
            throw e;
        }
    })).then((_) => {
        return data;
    });
}

function playerToRole(str) {
    switch (str) {
        case 'Top':
            return 'Top';
        case 'Jungler':
            return 'Jungle';
        case 'Mid':
            return 'Mid';
        case 'AD Carry':
            return 'ADC';
        case 'Support':
            return 'Support';
        default:
            return str;
    }
}

async function getRoles() {
    const getRoles = async (champion) => {
        const https = require('https');

        const options = {
            hostname: 'www.leagueofgraphs.com',
            path: `/champions/builds/${champion}/diamond`,
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Host': 'www.leagueofgraphs.com',
                'Pragma': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36 OPR/85.0.4341.79'
            }
        };

        return new Promise((resolve, reject) => {
            https.get(options, (response) => {

                var result = ''
                response.on('data', function (chunk) {
                    result += chunk;
                });

                response.on('end', async function () {
                    const dom = new JSDOM(result);
                    const roles = Array.from(dom.window.document.querySelectorAll('.rolesEntries .txt')).map((el)=>el.innerHTML.trim()).map((role)=>playerToRole(role));
                    resolve(roles);
                });
            });
        });
    };

    const champ_scores = PSV.parse(fs.readFileSync('data/champ_scores.tsv', 'utf8')).filter((x) => x['Champion'].length != 0);
    
    return Promise.all(champ_scores.map(async (champion) => {
        const championName = champion['Champion'];
        const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
        const tag = championTag == 'wukong' ? 'monkeyking' : championTag;
        const roles = await getRoles(tag);
        let obj = {'Champion': championName, 'Top': 0, 'Jungle': 0, 'Mid': 0, 'ADC': 0, 'Support': 0};
        roles.forEach((role, i) => {
            obj[role] = 5 - i;
        });
        return obj;
    })).then((_) => {
        return _;
    });
}

(async () => {
    fs.writeFile('./data/champ_scores.tsv', PSV.stringify(Object.values(await getWRs())), async err => {
        if (err) {
            console.error(err);
        }
        fs.writeFile('./data/champion_roles.tsv', PSV.stringify(await getRoles()), err => {
            if (err) {
                console.error(err);
            }
        });
    });
})();