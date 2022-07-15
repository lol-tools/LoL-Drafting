$(document).ready(function() { 
    const PSV = new TSV.TSV.Parser('\t');
    var champion_data;
    var teams = [
        {'top': {}, 'jg': {}, 'mid': {}, 'adc': {}, 'supp': {}},
        {'top': {}, 'jg': {}, 'mid': {}, 'adc': {}, 'supp': {}}
    ];

    var comfort = [], meta = [{'Top': {}, 'Jungle': {}, 'Mid': {}, 'ADC': {}, 'Support': {}}, {'Top': {}, 'Jungle': {}, 'Mid': {}, 'ADC': {}, 'Support': {}}];
    var your_champ_data_filter = [{}, {}];


    function set_modal(state) {
        $('.modal').modal(state);
    }

    function expandComps(comp) {
        const standardDeviation = (array) => {
            const n = array.length - 1;
            const mean = array.reduce((a, b) => a + b) / array.length;
            return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
        };
        const prefix = 'CompScore';
        const compProperties = ['Attack', 'Catch', 'Protect', 'Siege', 'Split'];
        let scores = {};
        const type = $('#comp_type').val();
        for (let i = 0 ; i < compProperties.length ; i += 1) {
            if (type == compProperties[i] || type == 'Base 1') {
                scores[prefix + compProperties[i]] = comp[prefix + compProperties[i]];
            }
        }
        if (type[type.length - 1] == '2') {
            for (let i = 0 ; i < compProperties.length ; i += 1) {
                for (let j = i + 1 ; j < compProperties.length ; j += 1) {
                    if (type == 'Ultimate 2') {
                        scores[prefix + compProperties[i] + '+' + compProperties[j]] = 3000 - standardDeviation([comp[prefix + compProperties[i]],
                                                                                                            comp[prefix + compProperties[j]]]);
                    }
                    if (type == 'Base 2') {
                        scores[prefix + compProperties[i] + '+' + compProperties[j]] = Math.min(comp[prefix + compProperties[i]],
                                                                                            comp[prefix + compProperties[j]]);
                    }
                }
            }
        }
        if (type[type.length - 1] == '3') {
            for (let i = 0 ; i < compProperties.length ; i += 1) {
                for (let j = i + 1 ; j < compProperties.length ; j += 1) {
                    for (let k = j + 1 ; k < compProperties.length ; k += 1) {
                        if (type == 'Ultimate 3') {
                            scores[prefix + compProperties[i] + '+' + compProperties[j] + '+' + compProperties[k]] = 3000 - standardDeviation([comp[prefix + compProperties[i]],
                                                                                                                                    comp[prefix + compProperties[j]],
                                                                                                                                    comp[prefix + compProperties[k]]]);
                        }
                        if (type == 'Base 3') {
                            scores[prefix + compProperties[i] + '+' + compProperties[j] + '+' + compProperties[k]] = Math.min(comp[prefix + compProperties[i]],
                                                                                                                    comp[prefix + compProperties[j]],
                                                                                                                    comp[prefix + compProperties[k]]);
                        }
                    }
                }
            }
        }
        if (type == 'Balance') {
            scores[prefix + 'Balance'] = 3000 - standardDeviation(compProperties.map((_, i) => comp[prefix + compProperties[i]]));
        }
        return scores;
    }

    function scoreChampionInComp(suggestion, _comp) {
        let comp = JSON.parse(JSON.stringify(_comp));
        comp.push(suggestion);
        const compProperties = ['CompScoreAttack', 'CompScoreCatch', 'CompScoreProtect', 'CompScoreSiege', 'CompScoreSplit'];
        const init = compProperties.reduce((sum, comp) => {
            sum[comp] = 0;
            return sum;
        }, {});
        const data = comp.map((champion) => {
            let obj = {};
            for (let prop of compProperties) {
                obj[prop] = champion[prop];
            }
            return obj;
        }).reduce((sum, champion) => {
            for (let prop of compProperties) {
                sum[prop] += champion[prop];
            }
            return sum;
        }, init);
        return expandComps(data);
    }

    function make_suggestions() {
        let suggestions = [
            {'Top': [], 'Jungle': [], 'Mid': [], 'ADC': [], 'Support': []},
            {'Top': [], 'Jungle': [], 'Mid': [], 'ADC': [], 'Support': []}
        ];

        const comp_team1 = Object.values(teams[0]).filter((x) => x['Champion'].length != 0);
        const comp_team2 = Object.values(teams[1]).filter((x) => x['Champion'].length != 0);

        for(let champion of Object.keys(champion_data)) {
            const championName = champion_data[champion]['Champion'];
            if (championName.length == 0) { continue; }
            for(let role of Object.keys(meta[0])) {
                suggestions[0][role].push([championName, scoreChampionInComp(champion_data[champion], comp_team1), your_champ_data_filter[0][championName][longToShort(role)], champion_data[champion]['WRScoreTotal']]);
            }
        }
        for(let champion of Object.keys(champion_data)) {
            const championName = champion_data[champion]['Champion'];
            if (championName.length == 0) { continue; }
            for(let role of Object.keys(meta[1])) {
                suggestions[1][role].push([championName, scoreChampionInComp(champion_data[champion], comp_team2), your_champ_data_filter[1][championName][longToShort(role)], champion_data[champion]['WRScoreTotal']]);
            }
        }

        for(let role of Object.keys(meta[1])) {
            suggestions[0][role] = suggestions[0][role].map((a) => {
                const championName = a[0];
                const maxCompScore = Math.max(...Object.values(a[1]));
                const score = maxCompScore*a[2]/10;
                const compType = Object.keys(a[1]).filter((comp) => a[1][comp] == maxCompScore).map((name) => name.slice('CompScore'.length)).join(',');
                return [championName, score, compType];
            });
            suggestions[1][role] = suggestions[1][role].map((a) => {
                const championName = a[0];
                const maxCompScore = Math.max(...Object.values(a[1]));
                const score = maxCompScore*a[2]/10;
                const compType = Object.keys(a[1]).filter((comp) => a[1][comp] == maxCompScore).map((name) => name.slice('CompScore'.length).split('+').join('/')).join(',');
                return [championName, score, compType];
            });
        }
        return suggestions;
    }

    function show_suggestions(suggestions) {
        let max_suggestions = 0;

        for(let role of Object.keys(meta[1])) {
            suggestions[0][role] = suggestions[0][role].filter((a) => a[1] > 0);
            suggestions[1][role] = suggestions[1][role].filter((a) => a[1] > 0);
            suggestions[0][role].sort((a, b) => -a[1]+b[1]);
            suggestions[1][role].sort((a, b) => -a[1]+b[1]);
            max_suggestions = Math.max(max_suggestions, suggestions[0][role].length, suggestions[1][role].length);
        }

        const elem = $('#suggestions');
        let html = "";
        for (let i = 0 ; i < max_suggestions ; i ++) {
            html += "<tr>";
            for (let team = 0 ; team < 2 ; team ++) {
                for (let role of Object.keys(suggestions[team])) {
                    if(suggestions[team][role].length > i) {
                        if (Object.values(teams[0]).filter((x) => x['Champion'] == suggestions[team][role][i][0]).length > 0 ||
                            Object.values(teams[1]).filter((x) => x['Champion'] == suggestions[team][role][i][0]).length > 0){
                                html += `<td class="picked" onclick="placeChamp(this, '${team}', '${role}');">`;
                        }
                        else {
                            html += `<td onclick="placeChamp(this, '${team}', '${role}');">`;
                        }
                        html += suggestions[team][role][i][0];
                        html += "</td>";
                        html += "<td>";
                        html += suggestions[team][role][i][2];
                        html += "</td>";
                        html += "<td>";
                        html += suggestions[team][role][i][1].toFixed(2);
                        html += "</td>";
                    }
                    if(suggestions[team][role].length == i) {
                        html += `<td colspan='3' rowspan='${max_suggestions - suggestions[team][role].length}'></td>`;
                    }
                }
            }
            html += "</tr>";
        }
        elem.html(html);
    }

    function refresh() {
        set_modal('show');
        for (let role in teams[0]) {
            updateValue(`game_${role}_diff_early`, Math.round((teams[0][role]['WRScoreEarly'] - teams[1][role]['WRScoreEarly'])*100)/100, '');
            updateValue(`game_${role}_diff_mid`  , Math.round((teams[0][role]['WRScoreMid']   - teams[1][role]['WRScoreMid']  )*100)/100, '');
            updateValue(`game_${role}_diff_late` , Math.round((teams[0][role]['WRScoreLate']  - teams[1][role]['WRScoreLate'] )*100)/100, '');
        }
        updateValue(`game_team_diff_early`, Math.round(Object.keys(teams[0]).map((role) => teams[0][role]['WRScoreEarly'] - teams[1][role]['WRScoreEarly']).reduce((sum, val) => sum + val, 0)*100)/100, '');
        updateValue(`game_team_diff_mid`  , Math.round(Object.keys(teams[0]).map((role) => teams[0][role]['WRScoreMid']   - teams[1][role]['WRScoreMid']  ).reduce((sum, val) => sum + val, 0)*100)/100, '');
        updateValue(`game_team_diff_late` , Math.round(Object.keys(teams[0]).map((role) => teams[0][role]['WRScoreLate']  - teams[1][role]['WRScoreLate'] ).reduce((sum, val) => sum + val, 0)*100)/100, '');
        show_suggestions(make_suggestions());
        set_modal('hide');
    }    
    
    function init() {
        $.ajax({
            url: "./data/champ_scores.tsv",
            type: "GET",
            beforeSend: function() {
                set_modal('show');
            },
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
                $.ajax({
                    url: "./data/champion_roles.tsv",
                    type: "GET",
                    beforeSend: function() {
                        set_modal('show');
                    },
                    success: function (data) {
                        data = data.toString();
                        let champion_list = PSV.parse(data).filter((x) => x['Champion'].length != 0);
                        for (let champion of champion_list) {
                            const championName = champion['Champion'];
                            const championTag = championName.toLowerCase().split('').filter((x) => 'a' <= x && x <= 'z').join('');
                            const tag = championTag == 'wukong' ? 'monkeyking' : championTag;
                            Object.keys(champion).forEach((role) => {
                                if(role == 'Champion') return;
                                meta[0][role][championName] = meta[1][role][championName] = champion[role];
                            });
                        }
                        for (let champion of champion_list) {
                            const championName = champion['Champion'];
                            for (let team in teams) {
                                your_champ_data_filter[team][championName] = {};
                                for (let role in teams[team]) {
                                    your_champ_data_filter[team][championName][role] = 3 * Math.pow(meta[team][shortToLong(role)][championName], 2);
                                }
                            }
                        } 
                    },
                    error: function (xhr, status) {
                        console.log(xhr, status);
                    },
                    complete: function (xhr, status) {
                        refresh();
                        $('#comp_type').change(function() {
                            refresh();
                        });
                    
                        $('.select_player').change(function() {
                            const element = $(this);
                            const player = element.val();
                            const team = parseInt($(this).attr('id').slice(4, 5)) - 1;
                            const role = element.attr('id').slice(6, -('_player'.length));
                            const longRole = shortToLong(element.attr('id').slice(6, -('_player'.length)));
                    
                            Object.keys(champion_data).forEach((champion) => {
                                if(champion.length > 0) {
                                    const championName = champion_data[champion]['Champion'];
                                    your_champ_data_filter[team][championName][role] = Math.pow(meta[team][longRole][championName], 2) * comfort[player][championName];
                                }
                            });
                    
                            refresh();
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
                                let playerObj = {};
                                playerObj[player] = data.map((row) => {
                                    let obj = {};
                                    obj[row['Champion']] = row[player];
                                    return obj;
                                }).reduce((obj, row) => Object.assign(obj, row), {});
                                return playerObj;
                            }).reduce((obj, row) => Object.assign(obj, row), {});
                    
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
                    
                            const player_options = players.map((player) => `<option val='${player}'>${player}</option>`).join('');
                            for (let role of Object.keys(teams[0])) {
                                $(`select#${teamId}_${role}_player`).html(player_options);
                                $(`select#${teamId}_${role}_player`).change();
                            }
                    
                            console.log(team, teams);
                            console.log(champion_data);
                            console.log(players, 'comfort:', comfort);
                            console.log(players, 'meta:', meta);
                            console.log(players, 'your_champ_data_filter:', your_champ_data_filter);
                            console.log(players, 'positions:', positions);
                    
                            refresh();
                        });
        
                        set_modal('hide');        
                    }
                });
            },
            error: function (xhr, status) {
                console.log(xhr, status);
            },
            complete: function (xhr, status) {
            }
        });
    }

    init();
});