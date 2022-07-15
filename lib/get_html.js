const jsdom = require("jsdom");
const { JSDOM } = jsdom;

async function getChampionWROverTime(champion) {
    const https = require('https');

    const options = {
        hostname: 'www.leagueofgraphs.com',
        path: `/champions/stats/${champion}/master/sr-ranked`,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Host': 'www.leagueofgraphs.com',
            'Pragma': 'no-cache',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36 OPR/85.0.4341.79'
        }
    }

    return new Promise((resolve, reject) => {
        https.get(options, (response) => {

            var result = ''
            response.on('data', function (chunk) {
                result += chunk;
            });

            response.on('end', async function () {
                resolve(result.toString());
            });
        });
    });
}

async function getMatchupWR(champion1, champion2) {
    const https = require('https');

    const options = {
        hostname: 'www.leagueofgraphs.com',
        path: `/champions/builds/${champion1}/vs-${champion2}/master/sr-ranked`,
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Host': 'www.leagueofgraphs.com',
            'Pragma': 'no-cache',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36 OPR/85.0.4341.79'
        }
    }

    return new Promise((resolve, reject) => {
        https.get(options, (response) => {

            var result = ''
            response.on('data', function (chunk) {
                result += chunk;
            });

            response.on('end', async function () {
                const dom = new JSDOM(result);
                const wr = parseFloat(dom.window.document.getElementById('graphDD2').innerHTML.trim().slice(0, -1)) / 100.0;
                resolve(wr);
            });
        });
    });
}

async function getViableRoles(champion) {
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
    }

    return new Promise((resolve, reject) => {
        https.get(options, (response) => {

            var result = ''
            response.on('data', function (chunk) {
                result += chunk;
            });

            response.on('end', async function () {
                const dom = new JSDOM(result);
                const roles = Array.from(dom.window.document.querySelectorAll('.rolesEntries .txt')).map((el)=>el.innerHTML.trim());
                resolve(roles);
            });
        });
    });
}

module.exports = {
    'getChampionWROverTime': getChampionWROverTime,
    'getMatchupWR': getMatchupWR,
    'getViableRoles': getViableRoles
}