async function getLeagueOfGraphs(champion) {
    const https = require('https');

    const options = {
        hostname: 'www.leagueofgraphs.com',
        path: `/champions/stats/${champion}/diamond/sr-ranked?tier=master_plus`,
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

module.exports = getLeagueOfGraphs;