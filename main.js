function getColorByNumber(number, min, max) {
    const mid = (min + max) / 2;
    const minColor = {
        red: 255,
        green: 0,
        blue: 0
    }, midColor = {
        red: 255,
        green: 255,
        blue: 0
    }, maxColor = {
        red: 0,
        green: 255,
        blue: 0
    };
    let answer = {red: 0, green: 0, blue: 0};
    if (Math.abs(number - min) < Math.abs(max - number)) {
        const percentFromMid = (number - min) / (mid - min);
        answer.red = minColor.red + Math.round((midColor.red - minColor.red) * percentFromMid);
        answer.green = minColor.green + Math.round((midColor.green - minColor.green) * percentFromMid);
        answer.blue = minColor.blue + Math.round((midColor.blue - minColor.blue) * percentFromMid);
    }
    else {
        const percentFromMid = (number - mid) / (max - mid);
        answer.red = midColor.red + Math.round((maxColor.red - midColor.red) * percentFromMid);
        answer.green = midColor.green + Math.round((maxColor.green - midColor.green) * percentFromMid);
        answer.blue = midColor.blue + Math.round((maxColor.blue - midColor.blue) * percentFromMid);
    }
    return "#" + answer.red.toString(16).padStart(2, '0') + answer.green.toString(16).padStart(2, '0') + answer.blue.toString(16).padStart(2, '0');
}

function updateValue(id, value, suffix) {
    $(`#${id}`).html(value + suffix);
    $(`#${id}`).css('background-color', getColorByNumber(value, -100, 100));
}

const PSV = new TSV.TSV.Parser('\t');

$(document).ready(function() { 
    var champion_data;
    var teams = [
        {'top': {}, 'jg': {}, 'mid': {}, 'adc': {}, 'supp': {}},
        {'top': {}, 'jg': {}, 'mid': {}, 'adc': {}, 'supp': {}}
    ];

    var comfort = [], meta = [{'Top': {}, 'Jungle': {}, 'Mid': {}, 'ADC': {}, 'Support': {}}, {'Top': {}, 'Jungle': {}, 'Mid': {}, 'ADC': {}, 'Support': {}}];
    var your_champ_data_filter = [{}, {}];


    function refresh() {
        for (let role in teams[0]) {
            updateValue(`game_${role}_diff_early`, Math.round((teams[0][role]['WRScoreEarly'] - teams[1][role]['WRScoreEarly'])*100)/100, '%');
            updateValue(`game_${role}_diff_mid`  , Math.round((teams[0][role]['WRScoreMid']   - teams[1][role]['WRScoreMid']  )*100)/100, '%');
            updateValue(`game_${role}_diff_late` , Math.round((teams[0][role]['WRScoreLate']  - teams[1][role]['WRScoreLate'] )*100)/100, '%');
        }
    }

    $.ajax({
        url: "./data/champ_scores.tsv",
        type: "GET",
        success: function (data) {
            data = data.toString();
            let champion_list = PSV.parse(data).filter((x) => x['Champion'].length != 0);
            champion_data = champion_list.reduce((obj, champion) => {
                const championName = champion['Champion'];
                const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
                const tag = championTag == 'wukong' ? 'monkeyking' : championTag;
                obj[tag] = champion;
                return obj;
            }, {});
            let champion_options = `<option value=""></option>`;
            for (let champion of champion_list) {
                const championName = champion['Champion'];
                const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
                const tag = championTag == 'wukong' ? 'monkeyking' : championTag;
                champion_options += `<option value="${tag}">${championName}</option>`;
            }
            for (let select of $('.select_champion')) {
                $(select).html(champion_options);
            }
            champion_data[''] = {'Champion': ''};
            for (let attr of Object.keys(champion_list[0])) {
                if (attr != 'Champion') {
                    champion_data[''][attr] = champion_list.map((x) => x[attr]).reduce((sum, value) => sum + value, 0) / champion_list.length; 
                }
            }
            champion_data['']['WRScoreEarly'] = 33.3;
            champion_data['']['WRScoreMid'] = 33.3;
            champion_data['']['WRScoreLate'] = 33.3;

            for (let team in teams) {
                for (let role in teams[team]) {
                    teams[team][role] = champion_data[''];
                }
            }
            refresh();
        },
        error: function (xhr, status) {
            console.log(xhr, status);
        },
        complete: function (xhr, status) {
            //$('#showresults').slideDown('slow')
        }
    });

    $('.select_player').change(function() {
        const element = $(this);
        const player = element.val();
    });

    $('.select_champion').change(function() {
        const element = $(this);
        const champion = element.val();
        const team = parseInt($(this).attr('id').slice(4, 5)) - 1;
        const role = $(this).attr('id').slice(6, -('_champion'.length));
        teams[team][role] = champion_data[champion];
        refresh();
    });

    $('input[type=file]').change(async function(event) {
        const teamId = $(this).attr('id');
        const team = parseInt(teamId.slice(-1)) - 1;
        const file = event.target.files.item(0)
        const text = await file.text();
        
        const data = PSV.parse(text).filter((x) => x['Champion'].length != 0); 
        const headers = Object.keys(data[0]);
        const players = headers.slice(1, -5);
        const positions = headers.slice(-5);

        // comfort fill
        comfort = players.map((player) => {
            return data.map((row) => {
                let obj = {};
                obj[row['Champion']] = row[player];
                return obj;
            }).reduce((obj, row) => Object.assign(obj, row), {});
        });

        // meta fill
        meta[team] = Object.keys(meta[team]).map((role) => {
            let obj = {};
            obj[role] = data.map((row) => {
                let rowObj = {};
                rowObj[row['Champion']] = row[role];
                return rowObj;
            }).reduce((obj, row) => Object.assign(obj, row), {});
            return obj;
        }).reduce((obj, row) => Object.assign(obj, row), {});

        // your champ data
        your_champ_data_filter[team] = Object.keys(champion_data).map((champion) => {
            return Object.keys(meta[team]).map((role) => {
                let obj = {};
                obj[champion] = {};
                obj[champion][role] = Math.pow(meta[team][role][champion_data[champion]['Champion']], 3);
                return obj;
            }).reduce((obj, row) => Object.assign(obj, row), {});
        }).reduce((obj, row) => Object.assign(obj, row), {});

        const player_options = players.map((player) => `<option val='${player}'>${player}</option>`).join('');
        for (let role of Object.keys(teams[0])) {
            $(`select#${teamId}_${role}_player`).html(player_options);
        }

        console.log(team, comfort, meta, your_champ_data_filter, players, positions);
    });
});