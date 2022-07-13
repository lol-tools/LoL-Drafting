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
        const percentFromMid = (max - number) / (max - mid);
        answer.red = maxColor.red + Math.round((maxColor.red - midColor.red) * percentFromMid);
        answer.green = maxColor.green + Math.round((maxColor.green - midColor.green) * percentFromMid);
        answer.blue = maxColor.blue + Math.round((maxColor.blue - midColor.blue) * percentFromMid);
    }
    return "#" + answer.red.toString(16).padStart(2, '0') + answer.green.toString(16).padStart(2, '0') + answer.blue.toString(16).padStart(2, '0');
}

const PSV = new TSV.TSV.Parser('\t');

$(document).ready(function() {
    var champion_data;
    var teams = [
        {'top': {}, 'jg': {}, 'mid': {}, 'adc': {}, 'supp': {}},
        {'top': {}, 'jg': {}, 'mid': {}, 'adc': {}, 'supp': {}}
    ];
    $.ajax({
        url: "./data/champ_scores.tsv",
        type: "GET",
        success: function (data) {
            data = data.toString();
            let champion_list = PSV.parse(data).filter((x) => x['Champion'].length != 0);
            champion_data = champion_list.reduce((obj, champion) => {
                obj[champion['Champion']] = champion;
                return obj;
            }, {});
            for (let select of $('.select_champion')) {
                $(select).html(`<option value=""></option>`);
                for (let champion of champion_list) {
                    const championName = champion['Champion'];
                    const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
                    const tag = championTag == 'wukong' ? 'monkeyking' : championTag;
                    $(select).html($(select).html() + `<option value="${championName}">${championName}</option>`);
                }
            }
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
        console.log(team, role);
        teams[team][role] = champion_data[champion];
        console.log(champion_data, teams);
        if (!('WRScoreEarly' in teams[0][role])) {
            teams[0][role]['WRScoreEarly'] = 33.3;
            teams[0][role]['WRScoreMid'] = 33.3;
            teams[0][role]['WRScoreLate'] = 33.3;
        }
        if (!('WRScoreEarly' in teams[1][role])) {
            teams[1][role]['WRScoreEarly'] = 33.3;
            teams[1][role]['WRScoreMid'] = 33.3;
            teams[1][role]['WRScoreLate'] = 33.3;
        }
        $(`#game_${role}_diff_early`).html(Math.round((teams[0][role]['WRScoreEarly'] - teams[1][role]['WRScoreEarly'])*100)/100 + '%');
        $(`#game_${role}_diff_mid`).html(Math.round((teams[0][role]['WRScoreMid'] - teams[1][role]['WRScoreMid'])*100)/100 + '%');
        $(`#game_${role}_diff_late`).html(Math.round((teams[0][role]['WRScoreLate'] - teams[1][role]['WRScoreLate'])*100)/100 + '%');
    });
    $('input[type=file]').change(async function(event) {
        const file = event.target.files.item(0)
        const text = await file.text();
        
        const data = PSV.parse(text).filter((x) => x['Champion'].length != 0); 
        const headers = Object.keys(data[0]);
        const players = headers.slice(1, -5);
        const positions = headers.slice(-5);

        console.log(data);
    });
});