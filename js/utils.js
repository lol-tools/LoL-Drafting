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
    $(`#${id}`).html(value.toFixed(2) + suffix);
    $(`#${id}`).css('background-color', getColorByNumber(value, -100, 100));
    $(`#${id}`).css('color', 'black');
}

function shortToLong(str) {
    switch (str) {
        case 'top':
            return 'Top';
        case 'jg':
            return 'Jungle';
        case 'mid':
            return 'Mid';
        case 'adc':
            return 'ADC';
        case 'supp':
            return 'Support';
        default:
            return str;
    }
}

function longToShort(str) {
    switch (str) {
        case 'Top':
            return 'top';
        case 'Jungle':
            return 'jg';
        case 'Mid':
            return 'mid';
        case 'ADC':
            return 'adc';
        case 'Support':
            return 'supp';
        default:
            return str;
    }
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

function placeChamp(elem, team, role) {
    team = parseInt(team) + 1;
    role = longToShort(role);
    const championName = $(elem).text();
    const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
    const tag = championTag == 'wukong' ? 'monkeyking' : championTag;
    $(`#team${team}_${role}_champion`).val(tag);
    $(`#team${team}_${role}_champion`).change();
}